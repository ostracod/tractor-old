
import { IdentifierDefinition } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { Pos } from "./pos.js";
import { NodeSlot } from "./node.js";
import { Definition } from "./definition.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { StatementGenerator } from "./statementGenerator.js";
import { Identifier, NumberIdentifier, IdentifierMap } from "./identifier.js";
import { IdentifierBehavior } from "./identifierBehavior.js";
import { Expression, IdentifierExpression } from "./expression.js";
import { FunctionSignature } from "./functionSignature.js";
import { CompItem, CompFunctionHandle } from "./compItem.js";

export abstract class FunctionDefinition extends Definition {
    block: NodeSlot<StatementBlock>;
    
    constructor(pos: Pos, block: StatementBlock) {
        super(pos);
        this.block = this.addSlot(block);
    }
    
    abstract getDisplayLinesHelper(): string[];
    
    getDisplayLines(): string[] {
        const output = this.getDisplayLinesHelper();
        niceUtils.extendWithIndentation(output, this.block.get().getDisplayLines());
        return output;
    }
}

export type IdentifierFunctionDefinitionConstructor = new (
    pos: Pos,
    identifierBehavior: IdentifierBehavior,
    block: StatementBlock,
) => IdentifierFunctionDefinition;

export abstract class IdentifierFunctionDefinition extends FunctionDefinition implements IdentifierDefinition {
    identifierBehavior: IdentifierBehavior;
    signature: NodeSlot<FunctionSignature>;
    
    constructor(pos: Pos, identifierBehavior: IdentifierBehavior, block: StatementBlock) {
        super(pos, block);
        this.identifierBehavior = identifierBehavior;
        const signature = this.block.get().createFunctionSignature();
        this.signature = this.addSlot(signature);
    }
    
    abstract getFunctionTypeName(): string;
    
    getCompItemOrNull(): CompItem {
        return new CompFunctionHandle(this);
    }
    
    getDisplayLinesHelper(): string[] {
        const typeText = this.getFunctionTypeName();
        const identifierText = this.identifierBehavior.getDisplayString();
        const output = [`${typeText} identifier: ${identifierText}`];
        const returnTypeLines = this.signature.get().getReturnTypeDisplayLines();
        niceUtils.extendWithIndentation(output, returnTypeLines);
        return output;
    }
}

export class NonInlineFunctionDefinition extends IdentifierFunctionDefinition {
    
    getFunctionTypeName(): string {
        return "Function";
    }
}

export class InlineFunctionDefinition extends IdentifierFunctionDefinition {
    
    getFunctionTypeName(): string {
        return "Inline function";
    }
    
    expandInlineHelper(
        args: Expression[],
        returnItemIdentifier: Identifier,
        endLabelIdentifier: Identifier,
        pos: Pos,
    ): StatementBlock {
        
        const generator = new StatementGenerator(pos);
        const output = new StatementBlock();
        const identifierMap = new IdentifierMap<Identifier>();
        const signature = this.signature.get();
        
        // Create a soft variable for each argument.
        signature.argVariableDefinitions.forEach((slot, index) => {
            const argVariableDefinition = slot.get();
            const identifier = new NumberIdentifier();
            identifierMap.add(
                argVariableDefinition.identifierBehavior.identifier,
                identifier,
            );
            const typeResolver = argVariableDefinition.typeResolver.get();
            const variableStatement = generator.createSoftVarStatement(
                identifier,
                typeResolver.expression.get().copy(),
                args[index].copy(),
            );
            output.addStatement(variableStatement);
        });
        
        // Expand the body and create definition identifiers.
        this.block.get().statements.forEach((slot) => {
            const statement = slot.get().copy();
            statement.createDeclarationIdentifiers(identifierMap);
            output.addStatement(statement);
        });
        
        // Replace identifiers in the expanded body.
        output.processExpressions((expression) => {
            const oldIdentifier = expression.evaluateToIdentifierOrNull();
            if (oldIdentifier === null) {
                return null;
            }
            const newIdentifier = identifierMap.get(oldIdentifier);
            if (newIdentifier === null) {
                return null;
            }
            return new IdentifierExpression(newIdentifier);
        });
        
        // Replace return statements with jump statements.
        output.processBlockStatements((statement) => {
            const { directive } = statement.type;
            if (directive !== "RET") {
                return null;
            }
            const statements = [];
            if (statement.args.length > 0) {
                const initStatement = generator.createInitStatement(
                    returnItemIdentifier,
                    statement.args[0].get(),
                );
                statements.push(initStatement);
            }
            const jumpStatement = generator.createJumpStatement(endLabelIdentifier);
            statements.push(jumpStatement);
            return statements;
        });
        
        return output;
    }
    
    expandInline(args: Expression[], pos: Pos): {
        statements: Statement[],
        returnItemIdentifier: Identifier,
    } {
        const statements: Statement[] = [];
        const generator = new StatementGenerator(pos, statements);
        let returnItemIdentifier: Identifier;
        const signature = this.signature.get();
        const returnTypeResolver = signature.returnTypeResolver.get();
        if (returnTypeResolver === null) {
            returnItemIdentifier = null;
        } else {
            returnItemIdentifier = new NumberIdentifier();
            generator.createSoftVarStatement(
                returnItemIdentifier,
                returnTypeResolver.expression.get().copy(),
            );
        }
        const endLabelIdentifier = new NumberIdentifier();
        const block = this.expandInlineHelper(
            args,
            returnItemIdentifier,
            endLabelIdentifier,
            pos,
        );
        generator.createScopeStatement(block);
        generator.createLabelStatement(endLabelIdentifier);
        return {
            statements,
            returnItemIdentifier,
        };
    }
}

export class InitFunctionDefinition extends FunctionDefinition {
    
    getDisplayLinesHelper(): string[] {
        return ["Init function"];
    }
    
    convertToUnixC(): string {
        const codeList = ["int main(int argc, const char *argv[]) {"];
        const block = this.block.get();
        codeList.push(block.convertToUnixC());
        codeList.push("return 0;\n}");
        return codeList.join("\n");
    }
}


