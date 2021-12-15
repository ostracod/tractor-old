
import * as niceUtils from "../niceUtils.js";
import { NodeSlot } from "../node.js";
import { Identifier, NumberIdentifier, IdentifierMap } from "../identifier.js";
import { DefinitionFunctionSignature } from "../functionSignature.js";
import { Pos } from "../parse/pos.js";
import { Statement } from "../statement/statement.js";
import { StatementBlock } from "../statement/statementBlock.js";
import { StatementGenerator } from "../statement/statementGenerator.js";
import { IdentifierBehavior } from "../identifierBehavior.js";
import { Expression, IdentifierExpression } from "../statement/expression.js";
import { CompItem } from "../compItem/compItem.js";
import { DefinitionFunctionHandle } from "../compItem/compValue.js";
import { Definition } from "./definition.js";

export type FunctionDefinitionConstructor = new (
    pos: Pos,
    identifierBehavior: IdentifierBehavior,
    block: StatementBlock,
) => FunctionDefinition;

export abstract class FunctionDefinition extends Definition {
    block: NodeSlot<StatementBlock>;
    signature: DefinitionFunctionSignature;
    
    constructor(pos: Pos, identifierBehavior: IdentifierBehavior, block: StatementBlock) {
        super(pos, identifierBehavior);
        this.block = this.addSlot(block);
        this.identifierBehavior = identifierBehavior;
    }
    
    initialize(): void {
        this.signature = this.block.get().createFunctionSignature();
    }
    
    abstract getFunctionTypeName(): string;
    
    getCompItemOrNull(): CompItem {
        return new DefinitionFunctionHandle(this);
    }
    
    getDisplayLines(): string[] {
        const typeText = this.getFunctionTypeName();
        const identifierText = this.identifierBehavior.getDisplayString();
        const output = [`${typeText} identifier: ${identifierText}`];
        const returnTypeLines = this.signature.getReturnTypeDisplayLines();
        niceUtils.extendWithIndentation(output, returnTypeLines);
        niceUtils.extendWithIndentation(output, this.block.get().getDisplayLines());
        return output;
    }
}

export class NonInlineFunctionDefinition extends FunctionDefinition {
    
    getFunctionTypeName(): string {
        return "Function";
    }
}

export class InlineFunctionDefinition extends FunctionDefinition {
    
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
        
        // Create an auto variable for each argument.
        this.signature.argVariableDefinitions.forEach((slot, index) => {
            const argVariableDefinition = slot.get();
            const identifier = new NumberIdentifier();
            identifierMap.add(
                argVariableDefinition.identifierBehavior.identifier,
                identifier,
            );
            const typeResolver = argVariableDefinition.typeResolver.get();
            const variableStatement = generator.createAutoVarStatement(
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
        const returnTypeResolver = this.signature.returnTypeResolver.get();
        if (returnTypeResolver === null) {
            returnItemIdentifier = null;
        } else {
            returnItemIdentifier = new NumberIdentifier();
            generator.createAutoVarStatement(
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


