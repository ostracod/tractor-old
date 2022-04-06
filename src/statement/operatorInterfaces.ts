/* eslint-disable @typescript-eslint/no-empty-interface */

import { CompItem } from "../compItem/compItem.js";
import { ItemType } from "../compItem/itemType.js";
import { IntegerType, PointerType } from "../compItem/basicType.js";

export interface OperatorInterface {
    
}

export interface UnaryOperatorInterface extends OperatorInterface {
    
}

export interface IntegerOperatorInterface extends UnaryOperatorInterface {
    getIntegerType(type: IntegerType): IntegerType;
    calculateInteger(operand: bigint): bigint;
}

export interface TypeOperatorInterface extends UnaryOperatorInterface {
    calculateItemByType(operand: ItemType): CompItem;
}

export interface BinaryOperatorInterface {
    
}

export interface TwoIntegersOperatorInterface extends BinaryOperatorInterface {
    getIntegerType(type1: IntegerType, type2: IntegerType): IntegerType;
    calculateInteger(operand1: bigint, operand2: bigint): bigint;
}

export interface TwoTypesOperatorInterface extends BinaryOperatorInterface {
    getTypeByTypes(): ItemType;
    calculateItemByTypes(operand1: ItemType, operand2: ItemType): CompItem;
}

export interface TwoPointersOperatorInterface extends BinaryOperatorInterface {
    getTypeByPointers(type1: PointerType, type2: PointerType): ItemType;
}

export interface ConversionOperatorInterface extends BinaryOperatorInterface {
    getConversionType(type1: ItemType, type2: ItemType): ItemType;
}


