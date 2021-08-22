
import { constructors } from "./constructors.js";
import { Node, NodeSlot } from "./node.js";
import { CompItem, CompString, CompFunctionHandle } from "./compItem.js";
import { UnaryOperator, BinaryOperator, unaryOperatorMap } from "./operator.js";
import { Identifier } from "./identifier.js";
import { Statement } from "./statement.js";
import { IdentifierFunctionDefinition, InlineFunctionDefinition } from "./functionDefinition.js";

export abstract class Expression extends Node {
    
    abstract copy(): Expression;
    
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
        return null;
    }
}

export class CompItemExpression extends Expression {
    item: CompItem;
    
    constructor(item: CompItem) {
        super();
        this.item = item;
    }
    
    getDisplayString(): string {
        if (this.item === null) {
            return "(Void)";
        } else {
            return this.item.getDisplayString();
        }
    }
    
    copy(): Expression {
        return new CompItemExpression(this.item);
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
    
    copy(): Expression {
        return new IdentifierExpression(this.identifier);
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        return this.identifier;
    }
    
    resolveCompItems(): Expression {
        const parentBlock = this.getParentBlock();
        const definition = parentBlock.getIdentifierDefinition(this.identifier);
        if (definition !== null) {
            const compItem = definition.getCompItemOrNull();
            if (compItem !== null) {
                return new CompItemExpression(compItem);
            }
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
    
    copy(): Expression {
        return new UnaryExpression(
            this.operator,
            this.operand.get().copy(),
        );
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
    
    copy(): Expression {
        return new BinaryExpression(
            this.operator,
            this.operand1.get().copy(),
            this.operand2.get().copy(),
        );
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
    
    copy(): Expression {
        return new SubscriptExpression(
            this.arrayExpression.get().copy(),
            this.indexExpression.get().copy(),
        );
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
    
    expandInlineFunctions(): { expression: Expression, statements: Statement[] } {
        const compItem = this.functionExpression.get().evaluateToCompItemOrNull();
        if (!(compItem instanceof CompFunctionHandle)) {
            return null;
        }
        const definition = compItem.functionDefinition;
        if (!(definition instanceof InlineFunctionDefinition)) {
            return null;
        }
        const argExpressions = this.argExpressions.map((slot) => slot.get());
        const result = definition.expandInline(argExpressions, this.getPos());
        const { statements, returnItemIdentifier } = result;
        let expression: Expression;
        if (returnItemIdentifier === null) {
            expression = new CompItemExpression(null);
        } else {
            expression = new IdentifierExpression(returnItemIdentifier);
        }
        return { expression, statements };
    }
    
    getDisplayString(): string {
        const textList = this.argExpressions.map((slot) => slot.get().getDisplayString());
        return `${this.functionExpression.get().getDisplayString()}(${textList.join(", ")})`;
    }
    
    copy(): Expression {
        return new InvocationExpression(
            this.functionExpression.get().copy(),
            this.argExpressions.map((slot) => slot.get().copy()),
        );
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
    
    copy(): Expression {
        return new ListExpression(this.elements.map((slot) => slot.get().copy()));
    }
}

constructors.Expression = Expression;


