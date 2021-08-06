
import { Displayable } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { CompilerError } from "./compilerError.js";
import { CompItem, CompString, CompFunctionHandle } from "./compItem.js";
import { UnaryOperator, BinaryOperator, unaryOperatorMap } from "./operator.js";
import { Identifier } from "./identifier.js";
import { Statement } from "./statement.js";
import { IdentifierFunctionDefinition } from "./functionDefinition.js";

export const processExpressionList = (
    expressions: Expression[],
    handle: (expression: Expression) => Expression,
): void => {
    expressions.forEach((inputExpression, index) => {
        const expression = handle(inputExpression);
        if (expression !== null) {
            expression.copyParentStatement(inputExpression);
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
    parentStatement: Statement;
    
    abstract getDisplayString(): string;
    
    // If processNestedExpressions returns an expression, then the output
    // will replace the original expression. If processNestedExpressions
    // returns null, then no modification occurs.
    processNestedExpressions(handle: (expression: Expression) => Expression): void {
        // Do nothing.
    }
    
    processMemberExpression (
        // name must be the name of a member variable which
        // contains an Expression.
        name: string,
        handle: (expression: Expression) => Expression,
    ): void {
        const parentExpression = this as unknown as { [name: string]: Expression };
        const inputExpression = parentExpression[name];
        const expression = handle(inputExpression);
        if (expression !== null) {
            expression.copyParentStatement(inputExpression);
            parentExpression[name] = expression;
        }
    };
    
    setParentStatement(statement: Statement) {
        this.parentStatement = statement;
        this.processNestedExpressions((expression) => {
            expression.setParentStatement(statement);
            return null;
        });
    }
    
    copyParentStatement(expression: Expression) {
        this.setParentStatement(expression.parentStatement);
    }
    
    createError(message: string): CompilerError {
        return new CompilerError(message, this.parentStatement.pos);
    }
    
    evaluateToCompItemOrNull(): CompItem {
        return null;
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        return null;
    }
    
    evaluateToString(): string {
        const constant = this.evaluateToCompItemOrNull();
        if (constant === null || !(constant instanceof CompString)) {
            throw this.createError("Expected string.");
        }
        return (constant as CompString).value;
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
    
    resolveCompItems(): Expression {
        this.processNestedExpressions((expression) => expression.resolveCompItems());
        return null;
    }
    
    expandInlineFunctions(): { expression: Expression, statements: Statement[] } {
        const statements = expandInlineFunctions((handle) => {
            this.processNestedExpressions(handle);
        });
        return { expression: null, statements };
    }
}

export class CompItemExpression extends Expression {
    item: CompItem;
    
    constructor(item: CompItem) {
        super();
        this.item = item;
    }
    
    getDisplayString(): string {
        return this.item.getDisplayString();
    }
    
    evaluateToCompItemOrNull(): CompItem {
        return this.item;
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
    
    resolveCompItems(): Expression {
        const parentBlock = this.parentStatement.parentBlock;
        const definition = parentBlock.getIdentifierDefinition(this.identifier);
        if (definition instanceof IdentifierFunctionDefinition) {
            const compItem = new CompFunctionHandle(definition);
            return new CompItemExpression(compItem);
        }
        super.resolveCompItems();
        return null;
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
        this.processMemberExpression("operand", handle);
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
        this.processMemberExpression("operand1", handle);
        this.processMemberExpression("operand2", handle);
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
        this.processMemberExpression("arrayExpression", handle);
        this.processMemberExpression("indexExpression", handle);
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
        this.processMemberExpression("functionExpression", handle);
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


