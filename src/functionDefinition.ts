
import { Statement } from "./statement.js";

export abstract class FunctionDefinition {
    statements: Statement[];
    
    constructor(statements: Statement[]) {
        this.statements = statements;
    }
    
    abstract toStringHelper(): string;
    
    toString(): string {
        return [
            this.toStringHelper(),
            ...this.statements.map((statement) => statement.toString(1)),
        ].join("\n")
    }
}

export class NamedFunctionDefinition extends FunctionDefinition {
    name: string;
    
    constructor(name: string, statements: Statement[]) {
        super(statements);
        this.name = name;
    }
    
    toStringHelper(): string {
        return `Named function ${this.name}`;
    }
}

export class InitFunctionDefinition extends FunctionDefinition {
    
    toStringHelper(): string {
        return "Init function";
    }
}


