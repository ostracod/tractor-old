
import { Constant } from "./constant.js";
import { UnaryOperator, BinaryOperator } from "./operator.js";

export abstract class Expression {
    
    abstract toString(): string;
}

export class ConstantExpression extends Expression {
    constant: Constant;
    
    constructor(constant: Constant) {
        super();
        this.constant = constant;
    }
    
    toString(): string {
        return this.constant.toString();
    }
}

export class IdentifierExpression extends Expression  {
    text: string;
    
    constructor(text: string) {
        super();
        this.text = text;
    }
    
    toString(): string {
        return this.text;
    }
}

export class UnaryExpression extends Expression {
    operator: UnaryOperator;
    operand: Expression;
    
    constructor(operator: UnaryOperator, operand: Expression) {
        super();
        this.operator = operator;
        this.operand = operand;
    }
    
    toString(): string {
        return `${this.operator.text}(${this.operand.toString()})`;
    }
}

export class BinaryExpression extends Expression {
    operator: BinaryOperator;
    operand1: Expression;
    operand2: Expression;
    
    constructor(operator: BinaryOperator, operand1: Expression, operand2: Expression) {
        super();
        this.operator = operator;
        this.operand1 = operand1;
        this.operand2 = operand2;
    }
    
    toString(): string {
        return `(${this.operand1.toString()} ${this.operator.text} ${this.operand2.toString()})`;
    }
}


