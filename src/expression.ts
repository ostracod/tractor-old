
import * as niceUtils from "./niceUtils.js";
import { constructors } from "./constructors.js";
import { Node, NodeSlot } from "./node.js";
import { CompItem, CompString, CompFunctionHandle } from "./compItem.js";
import { UnaryOperator, BinaryOperator, unaryOperatorMap } from "./operator.js";
import { Identifier } from "./identifier.js";
import { Statement } from "./statement.js";
import { IdentifierFunctionDefinition } from "./functionDefinition.js";

export const processExpressionList = (
    expressions: NodeSlot<Expression>[],
    handle: (expression: Expression) => Expression,
): void => {
    expressions.forEach((slot) => {
        const expression = handle(slot.get());
        if (expression !== null) {
            slot.set(expression);
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

export abstract class Expression extends Node {
    
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
        this.processExpressions((expression) => expression.resolveCompItems());
        return null;
    }
    
    expandInlineFunctions(): { expression: Expression, statements: Statement[] } {
        const statements = expandInlineFunctions((handle) => {
            this.processExpressions(handle);
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
        const parentBlock = this.getParentBlock();
        const definition = parentBlock.getIdentifierDefinition(this.identifier);
        if (definition instanceof IdentifierFunctionDefinition) {
            const compItem = new CompFunctionHandle(definition);
            return new CompItemExpression(compItem);
        }
        return super.resolveCompItems();
    }
}

export class UnaryExpression extends Expression {
    operator: UnaryOperator;
    operand: NodeSlot<Expression>;
    
    constructor(operator: UnaryOperator, operand: Expression) {
        super();
        this.operator = operator;
        this.operand = this.addSlot(operand);
    }
    
    getDisplayString(): string {
        return `${this.operator.text}(${this.operand.get().getDisplayString()})`;
    }
}

export class BinaryExpression extends Expression {
    operator: BinaryOperator;
    operand1: NodeSlot<Expression>;
    operand2: NodeSlot<Expression>;
    
    constructor(operator: BinaryOperator, operand1: Expression, operand2: Expression) {
        super();
        this.operator = operator;
        this.operand1 = this.addSlot(operand1);
        this.operand2 = this.addSlot(operand2);
    }
    
    getDisplayString(): string {
        return `(${this.operand1.get().getDisplayString()} ${this.operator.text} ${this.operand2.get().getDisplayString()})`;
    }
}

export class SubscriptExpression extends Expression {
    arrayExpression: NodeSlot<Expression>;
    indexExpression: NodeSlot<Expression>;
    
    constructor(arrayExpression: Expression, indexExpression: Expression) {
        super();
        this.arrayExpression = this.addSlot(arrayExpression);
        this.indexExpression = this.addSlot(indexExpression);
    }
    
    getDisplayString(): string {
        return `${this.arrayExpression.get().getDisplayString()}[${this.indexExpression.get().getDisplayString()}]`;
    }
}

export class InvocationExpression extends Expression {
    functionExpression: NodeSlot<Expression>;
    argExpressions: NodeSlot<Expression>[];
    
    constructor(functionExpression: Expression, argExpressions: Expression[]) {
        super();
        this.functionExpression = this.addSlot(functionExpression);
        this.argExpressions = this.addSlots(argExpressions);
    }
    
    // TODO: Override expandInlineFunctions.
    
    getDisplayString(): string {
        const textList = this.argExpressions.map((slot) => slot.get().getDisplayString());
        return `${this.functionExpression.get().getDisplayString()}(${textList.join(", ")})`;
    }
}

export class ListExpression extends Expression {
    elements: NodeSlot<Expression>[];
    
    constructor(elements: Expression[]) {
        super();
        this.elements = this.addSlots(elements);
    }
    
    getDisplayString(): string {
        const textList = this.elements.map((slot) => slot.get().getDisplayString());
        return `{${textList.join(", ")}}`;
    }
}

constructors.Expression = Expression;


