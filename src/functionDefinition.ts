
import { Displayable } from "./interfaces.js";
import { StatementBlock } from "./statementBlock.js";
import { Identifier } from "./identifier.js";
import { Expression } from "./expression.js";
import { ArgVariableDefinition } from "./variableDefinition.js";

export abstract class FunctionDefinition implements Displayable {
    block: StatementBlock;
    
    constructor(block: StatementBlock) {
        this.block = block;
    }
    
    abstract getDisplayStringHelper(): string;
    
    getDisplayString(): string {
        return [
            this.getDisplayStringHelper(),
            this.block.getDisplayString(1),
        ].join("\n")
    }
}

export type IdentifierFunctionDefinitionConstructor = new (
    identifier: Identifier,
    block: StatementBlock,
) => InlineFunctionDefinition;

export abstract class IdentifierFunctionDefinition extends FunctionDefinition {
    identifier: Identifier;
    argVariableDefinitions: ArgVariableDefinition[];
    returnTypeExpression: Expression;
    
    constructor(identifier: Identifier, block: StatementBlock) {
        super(block);
        this.identifier = identifier;
        this.argVariableDefinitions = [];
        this.returnTypeExpression = null;
        this.block.processStatements((statement) => {
            const { directive } = statement.type;
            if (directive === "ARG") {
                const identifier = statement.args[0].evaluateToIdentifier();
                const definition = new ArgVariableDefinition(identifier, statement.args[1]);
                this.argVariableDefinitions.push(definition);
                return [];
            } else if (directive === "RET_TYPE") {
                if (this.returnTypeExpression !== null) {
                    throw statement.createError("Extra RET_TYPE statement.");
                }
                this.returnTypeExpression = statement.args[0];
                return [];
            }
            return null;
        });
    }
    
    abstract getFunctionTypeName(): string;
    
    getDisplayStringHelper(): string {
        const typeText = this.getFunctionTypeName();
        const identifierText = this.identifier.getDisplayString();
        const output = [`${typeText} ${identifierText}`];
        this.argVariableDefinitions.forEach((definition) => {
            output.push(definition.getDisplayString());
        });
        if (this.returnTypeExpression !== null) {
            output.push("Return type: " + this.returnTypeExpression.getDisplayString());
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
}

export class InitFunctionDefinition extends FunctionDefinition {
    
    getDisplayStringHelper(): string {
        return "Init function";
    }
}


