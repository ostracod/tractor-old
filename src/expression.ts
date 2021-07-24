
import { CompilerError } from "./compilerError.js";
import { Constant, StringConstant } from "./constant.js";
import { UnaryOperator, BinaryOperator } from "./operator.js";

export abstract class Expression {
    
    abstract toString(): string;
    
    evaluateToConstantOrNull(): Constant {
        return null;
    }
    
    evaluateToString(): string {
        const constant = this.evaluateToConstantOrNull();
        if (constant === null || !(constant instanceof StringConstant)) {
            throw new CompilerError("Expected string.");
        }
        return (constant as StringConstant).value;
    }
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
    
    evaluateToConstantOrNull(): Constant {
        return this.constant;
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

export class SubscriptExpression extends Expression {
    arrayExpression: Expression;
    indexExpression: Expression;
    
    constructor(arrayExpression: Expression, indexExpression: Expression) {
        super();
        this.arrayExpression = arrayExpression;
        this.indexExpression = indexExpression;
    }
    
    toString(): string {
        return `${this.arrayExpression.toString()}[${this.indexExpression.toString()}]`;
    }
}

export class InvocationExpression extends Expression {
    functionExpression: Expression;
    argExpressions: Expression[];
    
    constructor(functionExpression: Expression, argExpressions: Expression[]) {
        super();
        this.functionExpression = functionExpression;
        this.argExpressions = argExpressions;
    }
    
    toString(): string {
        const textList = this.argExpressions.map((element) => element.toString());
        return `${this.functionExpression.toString()}(${textList.join(", ")})`;
    }
}

export class ListExpression extends Expression {
    elements: Expression[];
    
    constructor(elements: Expression[]) {
        super();
        this.elements = elements;
    }
    
    toString(): string {
        const textList = this.elements.map((element) => element.toString());
        return `{${textList.join(", ")}}`;
    }
}


