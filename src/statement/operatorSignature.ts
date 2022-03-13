
import { CompilerError } from "../compilerError.js";
import { CompItem, CompUnknown, CompKnown } from "../compItem/compItem.js";
import { CompVoid, CompInteger } from "../compItem/compValue.js";
import { ItemType } from "../compItem/itemType.js";
import { ValueType, IntegerType, PointerType } from "../compItem/basicType.js";
import { UnaryOperator, BinaryOperator, CastOperator } from "./operator.js";

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
    
    abstract calculateCompItem(
        operator: BinaryOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem;
}

export class AssignmentOperatorSignature extends BinaryOperatorSignature {
    
    calculateCompItem(
        operator: BinaryOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        return new CompVoid();
    }
    
    getDescription(): string {
        return "two operands";
    }
}

export class TwoIntegersOperatorSignature extends BinaryOperatorSignature {
    
    calculateCompItem(
        operator: BinaryOperator,
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

export class TwoTypesOperatorSignature extends BinaryOperatorSignature {
    
    calculateCompItem(
        operator: BinaryOperator,
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

export class TwoPointersOperatorSignature extends BinaryOperatorSignature {
    
    calculateCompItem(
        operator: BinaryOperator,
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
        operator: BinaryOperator,
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

export class IntegerPointerOperatorSignature extends BinaryOperatorSignature {
    
    calculateCompItem(
        operator: BinaryOperator,
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

export class ConversionOperatorSignature {
    
    calculateCompItem(
        operator: CastOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        // TODO: Implement.
        return null;
    }
    
    getDescription(): string {
        return "value + type";
    }
}

export class CastOperatorSignature {
    
    calculateCompItem(
        operator: CastOperator,
        operand1: CompItem,
        operand2: CompItem,
    ): CompItem {
        const operandType1 = operand1.getType();
        if (!(operandType1 instanceof ValueType && operand2 instanceof ItemType)) {
            return null;
        }
        if (!operandType1.canCastToType(operand2)) {
            throw new CompilerError("Cannot cast type.");
        }
        if (operand1 instanceof CompKnown) {
            return operand1.castToType(operand2);
        } else {
            return new CompUnknown(operand2);
        }
    }
    
    getDescription(): string {
        return "value + type";
    }
}


