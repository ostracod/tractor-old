
import { CompilerError } from "../compilerError.js";
import { CompItem, CompUnknown, CompKnown } from "../compItem/compItem.js";
import { CompVoid, CompInteger } from "../compItem/compValue.js";
import { ItemType } from "../compItem/itemType.js";
import { IntegerType, PointerType } from "../compItem/basicType.js";
import { CompType } from "../compItem/storageType.js";
import { AndType } from "../compItem/manipulationType.js";
import { OperatorInterface, UnaryOperatorInterface, IntegerOperatorInterface, TypeOperatorInterface, BinaryOperatorInterface, TwoIntegersOperatorInterface, TwoTypesOperatorInterface, TwoPointersOperatorInterface, ConversionOperatorInterface } from "./operatorInterfaces.js";

export abstract class OperatorSignature<T extends OperatorInterface = OperatorInterface> {
    
    constructor(operator: T) {
        // This constructor only serves to validate that
        // the operator conforms to the correct interface.
        // There may be a more elegant way to do this.
    }
    
    abstract getDescription(): string;
}

export abstract class UnaryOperatorSignature<T extends UnaryOperatorInterface = UnaryOperatorInterface> extends OperatorSignature<T> {
    
    abstract calculateCompItem(operator: T, operand: CompItem): CompItem;
}

export class IntegerOperatorSignature extends UnaryOperatorSignature<IntegerOperatorInterface> {
    
    calculateCompItem(operator: IntegerOperatorInterface, operand: CompItem): CompItem {
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

export class TypeOperatorSignature extends UnaryOperatorSignature<TypeOperatorInterface> {
    
    calculateCompItem(operator: TypeOperatorInterface, operand: CompItem): CompItem {
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

export abstract class BinaryOperatorSignature<T extends BinaryOperatorInterface = BinaryOperatorInterface> extends OperatorSignature<T> {
    
    abstract calculateCompItem(
        operator: T,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem;
}

export class AssignmentOperatorSignature extends BinaryOperatorSignature {
    
    calculateCompItem(
        operator: BinaryOperatorInterface,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        return new CompVoid();
    }
    
    getDescription(): string {
        return "two operands";
    }
}

export class TwoIntegersOperatorSignature extends BinaryOperatorSignature<TwoIntegersOperatorInterface> {
    
    calculateCompItem(
        operator: TwoIntegersOperatorInterface,
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

export class TwoTypesOperatorSignature extends BinaryOperatorSignature<TwoTypesOperatorInterface> {
    
    calculateCompItem(
        operator: TwoTypesOperatorInterface,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        if (operand1 instanceof ItemType && operand2 instanceof ItemType) {
            return operator.calculateItemByTypes(operand1, operand2);
        } else {
            const resultType = operator.getTypeByTypes();
            return new CompUnknown(resultType);
        }
    }
    
    getDescription(): string {
        return "two types";
    }
}

export class TwoPointersOperatorSignature extends BinaryOperatorSignature<TwoPointersOperatorInterface> {
    
    calculateCompItem(
        operator: TwoPointersOperatorInterface,
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

export class PointerIntegerOperatorSignature extends BinaryOperatorSignature {
    
    calculateCompItem(
        operator: BinaryOperatorInterface,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        const operandType1 = operand1.getType();
        const operandType2 = operand2.getType();
        if (operandType1 instanceof PointerType && operandType2 instanceof IntegerType) {
            const resultType = operandType1.copy();
            resultType.setStorageTypes([new CompType(true)]);
            return new CompUnknown(resultType);
        } else {
            return null;
        }
    }
    
    getDescription(): string {
        return "pointer + integer";
    }
}

export class IntegerPointerOperatorSignature extends BinaryOperatorSignature {
    
    calculateCompItem(
        operator: BinaryOperatorInterface,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        const operandType1 = operand1.getType();
        const operandType2 = operand2.getType();
        if (operandType1 instanceof IntegerType && operandType2 instanceof PointerType) {
            const resultType = operandType2.copy();
            resultType.setStorageTypes([new CompType(true)]);
            return new CompUnknown(resultType);
        } else {
            return null;
        }
    }
    
    getDescription(): string {
        return "integer + pointer";
    }
}

export class ConversionOperatorSignature extends BinaryOperatorSignature<ConversionOperatorInterface> {
    
    calculateCompItem(
        operator: ConversionOperatorInterface,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        if (!(operand2 instanceof ItemType)) {
            return null;
        }
        const operandType1 = operand1.getType();
        let conversionType = operator.getConversionType(operandType1, operand2);
        const storageTypes = operandType1.getConversionStorageTypes();
        if (storageTypes === null) {
            throw new CompilerError("Cannot resolve storage type for conversion.");
        }
        conversionType = (storageTypes as ItemType[]).reduce((accumulator, storageType) => (
            new AndType(accumulator, storageType)
        ), conversionType);
        if (!operandType1.canConvertToType(conversionType)) {
            throw new CompilerError("Cannot convert type.");
        }
        if (operand1 instanceof CompKnown) {
            return operand1.convertToType(conversionType);
        } else {
            return new CompUnknown(conversionType);
        }
    }
    
    getDescription(): string {
        return "value + type";
    }
}


