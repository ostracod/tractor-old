
import { IdentifierDefinition } from "./interfaces.js";
import { Pos } from "./pos.js";
import { Node, NodeSlot } from "./node.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { StatementGenerator } from "./statementGenerator.js";
import { Identifier, NumberIdentifier, IdentifierMap } from "./identifier.js";
import { Expression, IdentifierExpression } from "./expression.js";
import { ArgVariableDefinition } from "./variableDefinition.js";

export abstract class FunctionDefinition extends Node {
    block: NodeSlot<StatementBlock>;
    
    constructor(block: StatementBlock) {
        super();
        this.block = this.addSlot(block);
    }
    
    abstract getDisplayStringHelper(): string;
    
    getDisplayString(): string {
        return [
            this.getDisplayStringHelper(),
            this.block.get().getDisplayString(1),
        ].join("\n")
    }
}

export type IdentifierFunctionDefinitionConstructor = new (
    identifier: Identifier,
    block: StatementBlock,
) => IdentifierFunctionDefinition;

export abstract class IdentifierFunctionDefinition extends FunctionDefinition implements IdentifierDefinition {
    identifier: Identifier;
    argVariableDefinitions: NodeSlot<ArgVariableDefinition>[];
    returnTypeExpression: NodeSlot<Expression>;
    
    constructor(identifier: Identifier, block: StatementBlock) {
        super(block);
        this.identifier = identifier;
        this.argVariableDefinitions = [];
        this.returnTypeExpression = this.addSlot();
        this.processBlockStatements((statement) => {
            const { directive } = statement.type;
            if (directive === "ARG") {
                const identifier = statement.getDeclarationIdentifier();
                const typeExpression = statement.args[1].get();
                const definition = new ArgVariableDefinition(identifier, typeExpression);
                const slot = this.block.get().addIdentifierDefinition(definition);
                this.argVariableDefinitions.push(slot);
                return [];
            } else if (directive === "RET_TYPE") {
                if (this.returnTypeExpression.get() !== null) {
                    throw statement.createError("Extra RET_TYPE statement.");
                }
                const typeExpression = statement.args[0].get();
                this.returnTypeExpression.set(typeExpression);
                return [];
            }
            return [statement];
        });
    }
    
    abstract getFunctionTypeName(): string;
    
    getDisplayStringHelper(): string {
        const typeText = this.getFunctionTypeName();
        const identifierText = this.identifier.getDisplayString();
        const output = [`${typeText} ${identifierText}`];
        this.argVariableDefinitions.forEach((slot) => {
            output.push(slot.get().getDisplayString());
        });
        const returnTypeExpression = this.returnTypeExpression.get();
        if (returnTypeExpression !== null) {
            output.push("Return type: " + returnTypeExpression.getDisplayString());
        }
        return output.join("\n");
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
        generator: StatementGenerator,
    ): StatementBlock {
        
        const output = new StatementBlock();
        const identifierMap = new IdentifierMap<Identifier>();
        
        // Create a soft variable for each argument.
        this.argVariableDefinitions.forEach((slot, index) => {
            const argVariableDefinition = slot.get();
            const identifier = new NumberIdentifier();
            identifierMap.add(argVariableDefinition.identifier, identifier);
            const variableStatement = generator.createSoftVarStatement(
                identifier,
                argVariableDefinition.typeExpression.get().copy(),
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
        const returnTypeExpression = this.returnTypeExpression.get();
        if (this.returnTypeExpression === null) {
            returnItemIdentifier = null;
        } else {
            returnItemIdentifier = new NumberIdentifier();
            generator.addSoftVarStatement(
                returnItemIdentifier,
                returnTypeExpression.copy(),
            );
        }
        const endLabelIdentifier = new NumberIdentifier();
        const block = this.expandInlineHelper(
            args,
            returnItemIdentifier,
            endLabelIdentifier,
            generator,
        );
        generator.addScopeStatement(block);
        generator.addLabelStatement(endLabelIdentifier);
        return {
            statements,
            returnItemIdentifier,
        };
    }
}

export class InitFunctionDefinition extends FunctionDefinition {
    
    getDisplayStringHelper(): string {
        return "Init function";
    }
}


