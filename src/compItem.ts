
import { Displayable } from "./interfaces.js";
import { FunctionDefinition } from "./functionDefinition.js";

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
    functionDefinition: FunctionDefinition;
    
    constructor(functionDefinition: FunctionDefinition) {
        super();
        this.functionDefinition = functionDefinition;
    }
    
    getDisplayString(): string {
        return this.functionDefinition.getName();
    }
}


