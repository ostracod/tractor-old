
import { Displayable } from "./interfaces.js";
import { Statement } from "./statement.js";
import { Identifier } from "./identifier.js";

export abstract class FunctionDefinition implements Displayable {
    statements: Statement[];
    
    constructor(statements: Statement[]) {
        this.statements = statements;
    }
    
    abstract getDisplayStringHelper(): string;
    
    getDisplayString(): string {
        return [
            this.getDisplayStringHelper(),
            ...this.statements.map((statement) => statement.getDisplayString(1)),
        ].join("\n")
    }
}

export class IdentifierFunctionDefinition extends FunctionDefinition {
    identifier: Identifier;
    
    constructor(identifier: Identifier, statements: Statement[]) {
        super(statements);
        this.identifier = identifier;
    }
    
    getDisplayStringHelper(): string {
        return `Function ${this.identifier.getDisplayString()}`;
    }
}

export class InitFunctionDefinition extends FunctionDefinition {
    
    getDisplayStringHelper(): string {
        return "Init function";
    }
}


