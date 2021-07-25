
import { Displayable } from "./interfaces.js";
import { StatementBlock } from "./statementBlock.js";
import { Identifier } from "./identifier.js";

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

export class IdentifierFunctionDefinition extends FunctionDefinition {
    identifier: Identifier;
    
    constructor(identifier: Identifier, block: StatementBlock) {
        super(block);
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


