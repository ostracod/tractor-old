
import { Displayable } from "./interfaces.js";
import { IdentifierFunctionDefinition } from "./functionDefinition.js";

export abstract class CompItem implements Displayable {
    
    abstract getDisplayString(): string;
}

export class CompNumber extends CompItem {
    value: bigint;
    
    constructor(value: bigint) {
        super();
        this.value = value;
    }
    
    getDisplayString(): string {
        return this.value.toString();
    }
}

export class CompString extends CompItem {
    value: string;
    
    constructor(value: string) {
        super();
        this.value = value;
    }
    
    getDisplayString(): string {
        return `"${this.value}"`;
    }
}

export class CompFunctionHandle extends CompItem {
    functionDefinition: IdentifierFunctionDefinition;
    
    constructor(functionDefinition: IdentifierFunctionDefinition) {
        super();
        this.functionDefinition = functionDefinition;
    }
    
    getDisplayString(): string {
        return this.functionDefinition.identifier.getDisplayString();
    }
}


