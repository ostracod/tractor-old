
import { Constant } from "./constant.js";

export abstract class Expression {
    
}

export class ConstantExpression {
    constant: Constant;
    
    constructor(constant: Constant) {
        this.constant = constant;
    }
}

export class IdentifierExpression {
    text: string;
    
    constructor(text: string) {
        this.text = text;
    }
}


