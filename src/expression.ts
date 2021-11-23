
import { constructors } from "./constructors.js";
import { Node, NodeSlot } from "./node.js";
import { Definition } from "./definition.js";
import { CompItem } from "./compItem.js";
import { CompArray, DefinitionFunctionHandle, BuiltInFunctionHandle } from "./compValue.js";
import { UnaryOperator, BinaryOperator, unaryOperatorMap } from "./operator.js";
import { Identifier } from "./identifier.js";
import { Statement } from "./statement.js";
import { InlineFunctionDefinition } from "./functionDefinition.js";

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
        if (constant === null || !(constant instanceof CompArray)) {
            throw this.createError("Expected string.");
        }
        return (constant as CompArray).convertToString();
    }
    
    evaluateToIdentifier(): Identifier {
        const output = this.evaluateToIdentifierOrNull();
        if (output === null) {
            throw this.createError("Expected identifier.");
        }
        return output;
    }
    
    getDefinitionOrNull(): Definition {
        return null
    }
    
    getDefinition(): Definition {
        const output = this.getDefinitionOrNull();
        if (output === null) {
            throw this.createError("Expected definition.");
        }
        return output;
    }
    
    invertBooleanValue(): Expression {
        return new UnaryExpression(unaryOperatorMap["!"], this);
    }
    
    resolveCompItems(): Expression {
        const item = this.evaluateToCompItemOrNull();
        return (item === null) ? null : new CompItemExpression(item);
    }
    
    expandInlineFunctions(): { expression: Expression, statements: Statement[] } {
        return null;
    }
    
    // TODO: Make this method abstract after
    // implementing in each subclass.
    convertToUnixC(): string {
        throw this.createError("convertToUnixC is not yet implemented for this expression.");
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
    
    resolveCompItems(): Expression {
        return null;
    }
    
    convertToUnixC(): string {
        return this.item.convertToUnixC();
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
    
    evaluateToCompItemOrNull(): CompItem {
        const parentBlock = this.getParentBlock();
        return parentBlock.getCompItemByIdentifier(this.identifier);
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        return this.identifier;
    }
    
    getDefinitionOrNull(): Definition {
        const parentBlock = this.getParentBlock();
        return parentBlock.getDefinition(this.identifier);
    }
    
    convertToUnixC(): string {
        const definition = this.getDefinitionOrNull();
        return definition.identifierBehavior.getCodeString();
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
    
    evaluateToCompItemOrNull(): CompItem {
        const operand = this.operand.get().evaluateToCompItemOrNull();
        if (operand === null) {
            return null;
        }
        let output: CompItem;
        this.tryOperation(() => {
            output = this.operator.calculateCompItem(operand);
        });
        return output;
    }
    
    convertToUnixC(): string {
        return this.operator.generateUnixC(this.operand.get());
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
    
    evaluateToCompItemOrNull(): CompItem {
        const operand1 = this.operand1.get().evaluateToCompItemOrNull();
        const operand2 = this.operand2.get().evaluateToCompItemOrNull();
        if (operand1 === null || operand2 === null) {
            return null;
        }
        let output: CompItem;
        this.tryOperation(() => {
             output = this.operator.calculateCompItem(operand1, operand2);
        });
        return output;
    }
    
    convertToUnixC(): string {
        return this.operator.generateUnixC(this.operand1.get(), this.operand2.get());
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
    
    evaluateToCompItemOrNull(): CompItem {
        const result = super.evaluateToCompItemOrNull();
        if (result !== null) {
            return result;
        }
        const functionHandle = this.functionExpression.get().evaluateToCompItemOrNull();
        if (!(functionHandle instanceof BuiltInFunctionHandle)) {
            return null;
        }
        const args: CompItem[] = [];
        for (const slot of this.argExpressions) {
            const arg = slot.get().evaluateToCompItemOrNull();
            if (arg === null) {
                return;
            }
            args.push(arg);
        }
        return functionHandle.evaluateToCompItem(args);
    }
    
    expandInlineFunctions(): { expression: Expression, statements: Statement[] } {
        const compItem = this.functionExpression.get().evaluateToCompItemOrNull();
        if (!(compItem instanceof DefinitionFunctionHandle)) {
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
    
    convertToUnixC(): string {
        const functionCode = this.functionExpression.get().convertToUnixC();
        const argCodeList = this.argExpressions.map((slot) => slot.get().convertToUnixC());
        return `(${functionCode})(${argCodeList.join(", ")})`;
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


