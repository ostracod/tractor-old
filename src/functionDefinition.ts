
import { Displayable } from "./interfaces.js";
import { Statement } from "./statement.js";

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

export class NamedFunctionDefinition extends FunctionDefinition {
    name: string;
    
    constructor(name: string, statements: Statement[]) {
        super(statements);
        this.name = name;
    }
    
    getDisplayStringHelper(): string {
        return `Named function ${this.name}`;
    }
}

export class InitFunctionDefinition extends FunctionDefinition {
    
    getDisplayStringHelper(): string {
        return "Init function";
    }
}


