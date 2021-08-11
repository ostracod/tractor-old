
import { IdentifierDefinition } from "./interfaces.js";
import { Node, NodeSlot } from "./node.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { StatementGenerator } from "./statementGenerator.js";
import { Identifier, NumberIdentifier, IdentifierMap } from "./identifier.js";
import { Expression } from "./expression.js";
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
                const identifier = statement.args[0].get().evaluateToIdentifier();
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
        returnValueIdentifier: Identifier,
        generator: StatementGenerator,
    ): Statement[] {
        const output = [];
        const identifierMap = new IdentifierMap<Identifier>();
        this.argVariableDefinitions.forEach((slot) => {
            const argVariableDefinition = slot.get();
            const identifier = new NumberIdentifier();
            identifierMap.add(argVariableDefinition.identifier, identifier);
            const variableStatement = generator.createSoftVarStatement(
                identifier,
                argVariableDefinition.typeExpression.get().copy(),
            );
            output.push(variableStatement);
        });
        // TODO: Finish this function.
        console.log(identifierMap.getDisplayString());
        
        return output;
    }
    
    expandInline(args: Expression[], generator: StatementGenerator): {
        statements: Statement[],
        returnValueIdentifier: Identifier,
    } {
        const statements: Statement[] = [];
        let returnValueIdentifier: Identifier;
        const returnTypeExpression = this.returnTypeExpression.get();
        if (this.returnTypeExpression === null) {
            returnValueIdentifier = null;
        } else {
            returnValueIdentifier = new NumberIdentifier();
            const variableStatement = generator.createSoftVarStatement(
                returnValueIdentifier,
                returnTypeExpression.copy(),
            );
            statements.push(variableStatement);
        }
        const result = this.expandInlineHelper(args, returnValueIdentifier, generator);
        const block = this.createStatementBlock(result);
        const scopeStatement = generator.createScopeStatement(block);
        statements.push(scopeStatement);
        return {
            statements,
            returnValueIdentifier
        };
    }
}

export class InitFunctionDefinition extends FunctionDefinition {
    
    getDisplayStringHelper(): string {
        return "Init function";
    }
}


