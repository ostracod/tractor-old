
import { Displayable } from "./interfaces.js";
import { Pos } from "./pos.js";
import { CompilerError } from "./compilerError.js";
import { Constant, StringConstant } from "./constant.js";
import { UnaryOperator, BinaryOperator, unaryOperatorMap } from "./operator.js";
import { Identifier } from "./identifier.js";

export abstract class Expression implements Displayable {
    pos: Pos;
    
    abstract getDisplayString(): string;
    
    iterateOverNestedExpressions(handle: (expression: Expression) => void): void {
        // Do nothing.
    }
    
    setPos(pos: Pos) {
        this.pos = pos;
        this.iterateOverNestedExpressions((expression) => {
            expression.setPos(pos);
        });
    }
    
    createError(message: string): CompilerError {
        return new CompilerError(message, this.pos);
    }
    
    evaluateToConstantOrNull(): Constant {
        return null;
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        return null;
    }
    
    evaluateToString(): string {
        const constant = this.evaluateToConstantOrNull();
        if (constant === null || !(constant instanceof StringConstant)) {
            throw this.createError("Expected string.");
        }
        return (constant as StringConstant).value;
    }
    
    evaluateToIdentifier(): Identifier {
        const output = this.evaluateToIdentifierOrNull();
        if (output === null) {
            throw this.createError("Expected identifier.");
        }
        return output;
    }
    
    invertBooleanValue(): Expression {
        return new UnaryExpression(unaryOperatorMap["!"], this);
    }
}

export class ConstantExpression extends Expression {
    constant: Constant;
    
    constructor(constant: Constant) {
        super();
        this.constant = constant;
    }
    
    getDisplayString(): string {
        return this.constant.getDisplayString();
    }
    
    evaluateToConstantOrNull(): Constant {
        return this.constant;
    }
}

export class IdentifierExpression extends Expression  {
    identifier: Identifier;
    
    constructor(identifier: Identifier) {
        super();
        this.identifier = identifier;
    }
    
    getDisplayString(): string {
        return this.identifier.getDisplayString();
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        return this.identifier;
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
    
    iterateOverNestedExpressions(handle: (expression: Expression) => void): void {
        handle(this.operand);
    }
    
    getDisplayString(): string {
        return `${this.operator.text}(${this.operand.getDisplayString()})`;
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
    
    iterateOverNestedExpressions(handle: (expression: Expression) => void): void {
        handle(this.operand1);
        handle(this.operand2);
    }
    
    getDisplayString(): string {
        return `(${this.operand1.getDisplayString()} ${this.operator.text} ${this.operand2.getDisplayString()})`;
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
    
    iterateOverNestedExpressions(handle: (expression: Expression) => void): void {
        handle(this.arrayExpression);
        handle(this.indexExpression);
    }
    
    getDisplayString(): string {
        return `${this.arrayExpression.getDisplayString()}[${this.indexExpression.getDisplayString()}]`;
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
    
    iterateOverNestedExpressions(handle: (expression: Expression) => void): void {
        handle(this.functionExpression);
        this.argExpressions.forEach(handle);
    }
    
    getDisplayString(): string {
        const textList = this.argExpressions.map((element) => element.getDisplayString());
        return `${this.functionExpression.getDisplayString()}(${textList.join(", ")})`;
    }
}

export class ListExpression extends Expression {
    elements: Expression[];
    
    constructor(elements: Expression[]) {
        super();
        this.elements = elements;
    }
    
    iterateOverNestedExpressions(handle: (expression: Expression) => void): void {
        this.elements.forEach(handle);
    }
    
    getDisplayString(): string {
        const textList = this.elements.map((element) => element.getDisplayString());
        return `{${textList.join(", ")}}`;
    }
}


