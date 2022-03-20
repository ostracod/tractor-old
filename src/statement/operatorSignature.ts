
import { CompilerError } from "../compilerError.js";
import { TypeField } from "../resolvedField.js";
import { CompItem, CompUnknown, CompKnown } from "../compItem/compItem.js";
import { CompVoid, CompInteger, CompStruct } from "../compItem/compValue.js";
import { ItemType } from "../compItem/itemType.js";
import { ValueType, IntegerType, PointerType, FieldsType } from "../compItem/basicType.js";
import { UnaryOperator, BinaryOperator, TwoItemsOperator } from "./operator.js";
import { Expression } from "./expression.js";

export abstract class OperatorSignature {
    
    abstract getDescription(): string;
}

export abstract class UnaryOperatorSignature extends OperatorSignature {
    
    abstract calculateCompItem(operator: UnaryOperator, operand: CompItem): CompItem;
}

export class IntegerOperatorSignature extends UnaryOperatorSignature {
    
    calculateCompItem(operator: UnaryOperator, operand: CompItem): CompItem {
        const operandType = operand.getType();
        if (!(operandType instanceof IntegerType)) {
            return null;
        }
        const resultType = operator.getIntegerType(operandType);
        if (operand instanceof CompInteger) {
            let resultInteger = operator.calculateInteger(operand.value);
            resultInteger = resultType.restrictInteger(resultInteger);
            return new CompInteger(resultInteger, resultType);
        } else {
            return new CompUnknown(resultType);
        }
    }
    
    getDescription(): string {
        return "integer";
    }
}

export class TypeOperatorSignature extends UnaryOperatorSignature {
    
    calculateCompItem(operator: UnaryOperator, operand: CompItem): CompItem {
        if (operand instanceof ItemType) {
            return operator.calculateItemByType(operand);
        } else {
            return null;
        }
    }
    
    getDescription(): string {
        return "type";
    }
}

export abstract class BinaryOperatorSignature extends OperatorSignature {
    
    // If calculateCompItem returns true, then we do not
    // have enough information to determine whether the
    // signature is matched.
    // If calculateCompItem returns false, then the
    // signature definitely does not match.
    abstract calculateCompItem(
        operator: BinaryOperator,
        expression1: Expression,
        expression2: Expression,
    ): CompItem | boolean;
}

// operand.getType() is an instance of FieldsType.
export const accessFieldByName = (operand: CompItem, name: string): CompItem => {
    const fieldsType = operand.getType() as FieldsType;
    const field = fieldsType.fieldMap[name];
    if (typeof field === "undefined") {
        throw new CompilerError(`Could not find field with the name "${name}".`);
    }
    if (field instanceof TypeField) {
        return field.type;
    }
    if (operand instanceof CompStruct) {
        return operand.itemMap[name];
    }
    return new CompUnknown(field.type);
};

export class FieldAccessOperatorSignature extends BinaryOperatorSignature {
    
    calculateCompItem(
        operator: BinaryOperator,
        expression1: Expression,
        expression2: Expression,
    ): CompItem | boolean {
        const operand = expression1.evaluateToCompItemOrNull();
        const name = expression2.evaluateToIdentifierName();
        if (operand === null) {
            return true;
        }
        const operandType = operand.getType();
        if (!(operandType instanceof FieldsType)) {
            return false;
        }
        return accessFieldByName(operand, name);
    }
    
    getDescription(): string {
        return "struct/union + identifier";
    }
}

export abstract class TwoItemsOperatorSignature extends BinaryOperatorSignature {
    
    calculateCompItem(
        operator: TwoItemsOperator,
        expression1: Expression,
        expression2: Expression,
    ): CompItem | boolean {
        const operand1 = expression1.evaluateToCompItemOrNull();
        const operand2 = expression2.evaluateToCompItemOrNull();
        if (operand1 === null || operand2 === null) {
            return true;
        }
        const result = this.calculateCompItemHelper(operator, operand1, operand2);
        return (result === null) ? false : result;
    }
    
    abstract calculateCompItemHelper(
        operator: TwoItemsOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem;
}

export class AssignmentOperatorSignature extends TwoItemsOperatorSignature {
    
    calculateCompItemHelper(
        operator: TwoItemsOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        return new CompVoid();
    }
    
    getDescription(): string {
        return "two operands";
    }
}

export class TwoIntegersOperatorSignature extends TwoItemsOperatorSignature {
    
    calculateCompItemHelper(
        operator: TwoItemsOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        const operandType1 = operand1.getType();
        const operandType2 = operand2.getType();
        if (!(operandType1 instanceof IntegerType)
                || !(operandType2 instanceof IntegerType)) {
            return null;
        }
        const resultType = operator.getIntegerType(operandType1, operandType2);
        if (operand1 instanceof CompInteger && operand2 instanceof CompInteger) {
            let resultInteger = operator.calculateInteger(operand1.value, operand2.value);
            resultInteger = resultType.restrictInteger(resultInteger);
            return new CompInteger(resultInteger, resultType);
        } else {
            return new CompUnknown(resultType);
        }
    }
    
    getDescription(): string {
        return "two integers";
    }
}

export class TwoTypesOperatorSignature extends TwoItemsOperatorSignature {
    
    calculateCompItemHelper(
        operator: TwoItemsOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        if (operand1 instanceof ItemType && operand2 instanceof ItemType) {
            return operator.calculateItemByTypes(operand1, operand2);
        } else {
            return null;
        }
    }
    
    getDescription(): string {
        return "two types";
    }
}

export class TwoPointersOperatorSignature extends TwoItemsOperatorSignature {
    
    calculateCompItemHelper(
        operator: TwoItemsOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        const operandType1 = operand1.getType();
        const operandType2 = operand2.getType();
        if (operandType1 instanceof PointerType && operandType2 instanceof PointerType) {
            const resultType = operator.getTypeByPointers(operandType1, operandType2);
            return new CompUnknown(resultType);
        } else {
            return null;
        }
    }
    
    getDescription(): string {
        return "two pointers";
    }
}

export class PointerIntegerOperatorSignature extends TwoItemsOperatorSignature {
    
    calculateCompItemHelper(
        operator: TwoItemsOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        const operandType1 = operand1.getType();
        const operandType2 = operand2.getType();
        if (operandType1 instanceof PointerType && operandType2 instanceof IntegerType) {
            return new CompUnknown(operandType1);
        } else {
            return null;
        }
    }
    
    getDescription(): string {
        return "pointer + integer";
    }
}

export class IntegerPointerOperatorSignature extends TwoItemsOperatorSignature {
    
    calculateCompItemHelper(
        operator: TwoItemsOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        const operandType1 = operand1.getType();
        const operandType2 = operand2.getType();
        if (operandType1 instanceof IntegerType && operandType2 instanceof PointerType) {
            return new CompUnknown(operandType2);
        } else {
            return null;
        }
    }
    
    getDescription(): string {
        return "integer + pointer";
    }
}

export class ConversionOperatorSignature extends TwoItemsOperatorSignature {
    
    calculateCompItemHelper(
        operator: TwoItemsOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        const operandType1 = operand1.getType();
        if (!(operandType1 instanceof ValueType && operand2 instanceof ItemType)) {
            return null;
        }
        const conversionType = this.getConversionType(operandType1, operand2);
        if (!operandType1.canConvertToType(conversionType)) {
            throw new CompilerError("Cannot convert type.");
        }
        if (operand1 instanceof CompKnown) {
            return operand1.convertToType(conversionType);
        } else {
            return new CompUnknown(conversionType);
        }
    }
    
    getConversionType(type1: ItemType, type2: ItemType): ItemType {
        return type2;
    }
    
    getDescription(): string {
        return "value + type";
    }
}

export class CastOperatorSignature extends ConversionOperatorSignature {
    
    getConversionType(type1: ItemType, type2: ItemType): ItemType {
        const output = type1.intersectType(type2);
        if (output === null) {
            throw new CompilerError("Cannot cast type.");
        }
        return output;
    }
}


