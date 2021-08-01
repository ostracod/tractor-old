
import { Displayable } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { Pos } from "./pos.js";
import { CompilerError } from "./compilerError.js";
import { Constant, StringConstant } from "./constant.js";
import { UnaryOperator, BinaryOperator, unaryOperatorMap } from "./operator.js";
import { Identifier } from "./identifier.js";
import { Statement } from "./statement.js";

export const processExpressionList = (
    expressions: Expression[],
    handle: (expression: Expression) => Expression,
): void => {
    expressions.forEach((inputExpression, index) => {
        const expression = handle(inputExpression);
        if (expression !== null) {
            expressions[index] = expression;
        }
    });
}

export const expandInlineFunctions = (
    process: (handle: (expression: Expression) => Expression) => void,
): Statement[] => {
    const output: Statement[] = [];
    process((expression) => {
        const result = expression.expandInlineFunctions();
        niceUtils.extendList(output, result.statements);
        return result.expression;
    });
    return output;
};

export abstract class Expression implements Displayable {
    pos: Pos;
    
    abstract getDisplayString(): string;
    
    // If processNestedExpressions returns an expression, then the output
    // will replace the original expression. If processNestedExpressions
    // returns null, then no modification occurs.
    processNestedExpressions(handle: (expression: Expression) => Expression): void {
        // Do nothing.
    }
    
    setPos(pos: Pos) {
        this.pos = pos;
        this.processNestedExpressions((expression) => {
            expression.setPos(pos);
            return null;
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
    
    expandInlineFunctions(): { expression: Expression, statements: Statement[] } {
        const statements = expandInlineFunctions((handle) => {
            this.processNestedExpressions(handle);
        });
        return { expression: null, statements };
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
    
    processNestedExpressions(handle: (expression: Expression) => Expression): void {
        const expression = handle(this.operand);
        if (expression !== null) {
            this.operand = expression;
        }
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
    
    processNestedExpressions(handle: (expression: Expression) => Expression): void {
        let expression: Expression;
        expression = handle(this.operand1);
        if (expression !== null) {
            this.operand1 = expression;
        }
        expression = handle(this.operand2);
        if (expression !== null) {
            this.operand2 = expression;
        }
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
    
    processNestedExpressions(handle: (expression: Expression) => Expression): void {
        let expression: Expression;
        expression = handle(this.arrayExpression);
        if (expression !== null) {
            this.arrayExpression = expression;
        }
        expression = handle(this.indexExpression);
        if (expression !== null) {
            this.indexExpression = expression;
        }
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
    
    processNestedExpressions(handle: (expression: Expression) => Expression): void {
        const expression = handle(this.functionExpression);
        if (expression !== null) {
            this.functionExpression = expression;
        }
        processExpressionList(this.argExpressions, handle);
    }
    
    // TODO: Override expandInlineFunctions.
    
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
    
    processNestedExpressions(handle: (expression: Expression) => Expression): void {
        processExpressionList(this.elements, handle);
    }
    
    getDisplayString(): string {
        const textList = this.elements.map((element) => element.getDisplayString());
        return `{${textList.join(", ")}}`;
    }
}


