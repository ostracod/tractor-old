
export abstract class Constant {
    
    abstract toString(): string;
}

export class NumberConstant extends Constant {
    value: bigint;
    
    constructor(value: bigint) {
        super();
        this.value = value;
    }
    
    toString(): string {
        return this.value.toString();
    }
}

export class StringConstant extends Constant {
    value: string;
    
    constructor(value: string) {
        super();
        this.value = value;
    }
    
    toString(): string {
        return `"${this.value}"`;
    }
}


