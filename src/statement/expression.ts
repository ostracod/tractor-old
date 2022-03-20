
import { constructors } from "../constructors.js";
import { Node, NodeSlot } from "../node.js";
import { Identifier, NameIdentifier } from "../identifier.js";
import { TypeField } from "../resolvedField.js";
import { InlineFunctionDefinition } from "../definition/functionDefinition.js";
import { Definition } from "../definition/definition.js";
import { CompItem, CompUnknown, CompKnown } from "../compItem/compItem.js";
import { IntegerType, characterType, ArrayType, FieldsType, ListType } from "../compItem/basicType.js";
import { CompType } from "../compItem/storageType.js";
import { CompVoid, CompInteger, CompArray, CompStruct, FunctionHandle, DefinitionFunctionHandle, BuiltInFunctionHandle, CompList } from "../compItem/compValue.js";
import { Statement } from "./statement.js";
import { UnaryOperator, BinaryOperator, unaryOperatorMap } from "./operator.js";

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
        if (!(constant instanceof CompArray)) {
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
    
    evaluateToIdentifierName(): string {
        const identifier = this.evaluateToIdentifier();
        if (!(identifier instanceof NameIdentifier)) {
            throw this.createError("Expected name identifier.");
        }
        return identifier.name;
    }
    
    getDefinitionOrNull(): Definition {
        return null;
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
    
    resolveCompKnowns(): Expression {
        const item = this.evaluateToCompItemOrNull();
        return (item instanceof CompKnown) ? new CompKnownExpression(item) : null;
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

export class CompKnownExpression extends Expression {
    item: CompKnown;
    
    constructor(item: CompKnown) {
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
    
    resolveCompKnowns(): Expression {
        return null;
    }
    
    convertToUnixC(): string {
        return this.item.convertToUnixC();
    }
    
    copy(): Expression {
        return new CompKnownExpression(this.item);
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

abstract class AccessExpression extends Expression {

    // operand.getType() must be an instance of FieldsType.
    accessFieldByName(operand: CompItem, name: string): CompItem {
        const fieldsType = operand.getType() as FieldsType;
        const field = fieldsType.fieldMap[name];
        if (typeof field === "undefined") {
            throw this.createError(`Could not find field with the name "${name}".`);
        }
        if (field instanceof TypeField) {
            return field.type;
        }
        if (operand instanceof CompStruct) {
            return operand.itemMap[name];
        }
        return new CompUnknown(field.type);
    }
}

export class SubscriptExpression extends AccessExpression {
    expression1: NodeSlot<Expression>;
    expression2: NodeSlot<Expression>;
    
    constructor(expression1: Expression, expression2: Expression) {
        super();
        this.expression1 = this.addSlot(expression1);
        this.expression2 = this.addSlot(expression2);
    }
    
    getDisplayString(): string {
        return `${this.expression1.get().getDisplayString()}[${this.expression2.get().getDisplayString()}]`;
    }
    
    // operand1.getType() must be an instance of ArrayType.
    accessArrayElement(operand1: CompItem, operand2: CompItem): CompItem {
        const arrayType = operand1.getType() as ArrayType;
        let index: number = null;
        if (operand2 !== null) {
            if (operand2 instanceof CompUnknown) {
                if (!(operand2.getType() instanceof IntegerType)) {
                    throw this.createError("Expected integer.");
                }
            } else if (operand2 instanceof CompInteger) {
                index = Number(operand2.value);
            } else {
                throw this.createError("Expected integer.");
            }
        }
        if (index !== null) {
            if (index < 0 || (arrayType.length !== null && index >= arrayType.length)) {
                throw this.createError("Array index is out of bounds.");
            }
        }
        if (operand1 instanceof CompUnknown || index === null) {
            return new CompUnknown(arrayType.elementType);
        } else if (operand1 instanceof CompArray) {
            return operand1.elements[index];
        } else {
            throw this.createError("Expected array.");
        }
    }
    
    // operand1.getType() must be an instance of FieldsType.
    accessFieldByItem(operand1: CompItem, operand2: CompItem): CompItem {
        if (operand2 === null) {
            return null;
        }
        if (operand2 instanceof CompUnknown) {
            const compStringType = new ArrayType(characterType);
            compStringType.storageTypes.push(new CompType());
            if (!operand2.getType().conformsToType(compStringType)) {
                throw this.createError("Expected compile-time string.");
            }
            return null;
        }
        if (!(operand2 instanceof CompArray)) {
            throw this.createError("Expected string.");
        }
        const name = operand2.convertToString();
        return this.accessFieldByName(operand1, name);
    }
    
    evaluateToCompItemOrNull(): CompItem {
        const operand1 = this.expression1.get().evaluateToCompItemOrNull();
        const operand2 = this.expression2.get().evaluateToCompItemOrNull();
        if (operand1 === null) {
            return null;
        }
        const operandType1 = operand1.getType();
        if (operandType1 instanceof ArrayType) {
            return this.accessArrayElement(operand1, operand2);
        } else if (operandType1 instanceof FieldsType) {
            return this.accessFieldByItem(operand1, operand2);
        } else {
            throw this.createError("Expected array, struct, or union.");
        }
    }
    
    convertToUnixC(): string {
        const operandCode1 = this.expression1.get().convertToUnixC();
        const operandCode2 = this.expression2.get().convertToUnixC();
        return `(${operandCode1}[${operandCode2}])`;
    }
    
    copy(): Expression {
        return new SubscriptExpression(
            this.expression1.get().copy(),
            this.expression2.get().copy(),
        );
    }
}

export class FieldAccessExpression extends AccessExpression {
    operand: NodeSlot<Expression>;
    fieldName: string;
    
    constructor(operand: Expression, fieldName: string) {
        super();
        this.operand = this.addSlot(operand);
        this.fieldName = fieldName;
    }
    
    getDisplayString(): string {
        return `${this.operand.get().getDisplayString()}.${this.fieldName}`;
    }
    
    evaluateToCompItemOrNull(): CompItem {
        const operand = this.operand.get().evaluateToCompItemOrNull();
        if (operand === null) {
            return null;
        }
        if (!(operand.getType() instanceof FieldsType)) {
            throw this.createError("Expected struct or union.");
        }
        return this.accessFieldByName(operand, this.fieldName);
    }
    
    convertToUnixC(): string {
        return `${this.operand.get().convertToUnixC()}.${this.fieldName})`;
    }
    
    copy(): Expression {
        return new FieldAccessExpression(this.operand.get().copy(), this.fieldName);
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
    
    getFunctionHandle(): FunctionHandle {
        const functionHandle = this.functionExpression.get().evaluateToCompItemOrNull();
        if (functionHandle === null) {
            return null;
        }
        if (!(functionHandle instanceof FunctionHandle)) {
            throw this.createError("Expected function handle.");
        }
        return functionHandle;
    }
    
    evaluateToCompItemOrNull(): CompItem {
        const functionHandle = this.getFunctionHandle();
        if (!(functionHandle instanceof BuiltInFunctionHandle)) {
            return null;
        }
        const args: CompItem[] = [];
        for (const slot of this.argExpressions) {
            const arg = slot.get().evaluateToCompItemOrNull();
            if (arg === null) {
                return null;
            }
            args.push(arg);
        }
        let output: CompItem;
        this.tryOperation(() => {
            output = functionHandle.evaluateToCompItem(args);
        });
        return output;
    }
    
    expandInlineFunctions(): { expression: Expression, statements: Statement[] } {
        const functionHandle = this.getFunctionHandle();
        if (!(functionHandle instanceof DefinitionFunctionHandle)) {
            return null;
        }
        const definition = functionHandle.functionDefinition;
        if (!(definition instanceof InlineFunctionDefinition)) {
            return null;
        }
        const argExpressions = this.argExpressions.map((slot) => slot.get());
        const result = definition.expandInline(argExpressions, this.getPos());
        const { statements, returnItemIdentifier } = result;
        let expression: Expression;
        if (returnItemIdentifier === null) {
            expression = new CompKnownExpression(new CompVoid());
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
        const functionHandle = this.getFunctionHandle();
        const argCodeList = this.argExpressions.map((slot) => (
            slot.get().convertToUnixC()
        ));
        if (functionHandle instanceof BuiltInFunctionHandle) {
            return functionHandle.convertInvocationToUnixC(argCodeList);
        } else {
            const functionCode = this.functionExpression.get().convertToUnixC();
            return `(${functionCode})(${argCodeList.join(", ")})`;
        }
    }
    
    copy(): Expression {
        return new InvocationExpression(
            this.functionExpression.get().copy(),
            this.argExpressions.map((slot) => slot.get().copy()),
        );
    }
}

export class ListExpression extends Expression {
    expressions: NodeSlot<Expression>[];
    
    constructor(expressions: Expression[]) {
        super();
        this.expressions = this.addSlots(expressions);
    }
    
    getDisplayString(): string {
        const textList = this.expressions.map((slot) => slot.get().getDisplayString());
        return textList.join(", ");
    }
    
    evaluateToCompItemOrNull(): CompItem {
        const items: CompItem[] = [];
        let hasUnknownItem = false;
        for (const slot of this.expressions) {
            const item = slot.get().evaluateToCompItemOrNull();
            if (item === null) {
                return null;
            }
            if (item instanceof CompUnknown) {
                hasUnknownItem = true;
            }
            items.push(item);
        }
        if (hasUnknownItem) {
            const types = items.map((item) => item.getType());
            return new CompUnknown(new ListType(types));
        } else {
            return new CompList(items as CompKnown[]);
        }
    }
    
    copy(): Expression {
        return new ListExpression(this.expressions.map((slot) => slot.get().copy()));
    }
}

constructors.Expression = Expression;


