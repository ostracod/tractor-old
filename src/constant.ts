
export abstract class Constant {
    
}

export class NumberConstant {
    value: bigint;
    
    constructor(value: bigint) {
        this.value = value;
    }
}

export class StringConstant {
    value: string;
    
    constructor(value: string) {
        this.value = value;
    }
}


