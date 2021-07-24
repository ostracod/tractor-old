
import { Displayable } from "./interfaces.js";

export abstract class Constant implements Displayable {
    
    abstract getDisplayString(): string;
}

export class NumberConstant extends Constant {
    value: bigint;
    
    constructor(value: bigint) {
        super();
        this.value = value;
    }
    
    getDisplayString(): string {
        return this.value.toString();
    }
}

export class StringConstant extends Constant {
    value: string;
    
    constructor(value: string) {
        super();
        this.value = value;
    }
    
    getDisplayString(): string {
        return `"${this.value}"`;
    }
}


