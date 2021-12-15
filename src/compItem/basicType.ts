
import * as niceUtils from "../niceUtils.js";
import { constructors } from "../constructors.js";
import { CompilerError } from "../compilerError.js";
import { ResolvedField } from "../resolvedField.js";
import { FunctionSignature } from "../functionSignature.js";
import { ItemType } from "./itemType.js";

export abstract class BasicType extends ItemType {
    
}

export class TypeType extends BasicType {
    type: ItemType;
    
    constructor(type: ItemType) {
        super();
        this.type = type;
    }
    
    containsType(type: ItemType): boolean {
        if (!super.containsType(type)) {
            return false;
        }
        const typeType = type as TypeType;
        return this.type.containsType(typeType.type);
    }
    
    intersectsHelper(type: ItemType): boolean {
        if (!super.intersectsHelper(type)) {
            return false;
        }
        const typeType = type as TypeType;
        return this.type.intersectsWithType(typeType.type);
    }
    
    getDisplayString(): string {
        return `typeT(${this.type.getDisplayString()})`;
    }
}

export class ValueType extends BasicType {
    
    getDisplayString(): string {
        return "valueT";
    }
}

export class VoidType extends ValueType {
    
    getSize(): number {
        return 0;
    }
    
    getDisplayString(): string {
        return "voidT";
    }
}

export class IntegerType extends ValueType {
    isSigned: boolean;
    bitAmount: number;
    
    constructor(isSigned: boolean = null, bitAmount: number = null) {
        super();
        this.isSigned = isSigned;
        this.bitAmount = bitAmount;
    }
    
    getSize(): number {
        return (this.bitAmount === null) ? null : Math.ceil(this.bitAmount / 8);
    }
    
    containsType(type: ItemType): boolean {
        if (!super.containsType(type)) {
            return false;
        }
        const intType = type as IntegerType;
        if (this.isSigned !== null && this.isSigned !== intType.isSigned) {
            return false;
        }
        return (this.bitAmount === null || this.bitAmount === intType.bitAmount);
    }
    
    intersectsHelper(type: ItemType): boolean {
        if (!super.intersectsHelper(type)) {
            return false;
        }
        const intType = type as IntegerType;
        if (this.isSigned !== null && intType.isSigned !== null
                && this.isSigned !== intType.isSigned) {
            return false;
        }
        return (this.bitAmount === null || intType.bitAmount === null
            || this.bitAmount === intType.bitAmount);
    }
    
    getDisplayString(): string {
        let term: string;
        if (this.isSigned === null) {
            term = "int";
        } else if (this.isSigned) {
            term = "sInt";
        } else {
            term = "uInt";
        }
        const suffix = (this.bitAmount === null) ? "" : this.bitAmount.toString();
        return term + suffix + "T";
    }
    
    restrictInteger(value: bigint): bigint {
        if (this.bitAmount === null) {
            if (this.isSigned === false && value < 0) {
                return -value;
            }
            return value;
        }
        let minimumValue: bigint;
        if (this.isSigned === null) {
            minimumValue = -(1n << BigInt(this.bitAmount));
        } else if (this.isSigned) {
            minimumValue = -(1n << BigInt(this.bitAmount - 1));
        } else {
            minimumValue = 0n;
        }
        let maximumValue: bigint;
        if (this.isSigned === true) {
            maximumValue = (1n << BigInt(this.bitAmount - 1)) - 1n;
        } else {
            maximumValue = (1n << BigInt(this.bitAmount)) - 1n;
        }
        if (value < minimumValue || value > maximumValue) {
            const divisor = (maximumValue - minimumValue) + 1n;
            const remainder = niceUtils.betterBigIntModulus(value - minimumValue, divisor);
            return remainder + minimumValue;
        } else {
            return value;
        }
    }
    
    convertToUnixC(): string {
        if (this.isSigned === null || this.bitAmount === null) {
            throw new CompilerError("Expected concrete type.");
        }
        return (this.isSigned) ? `int${this.bitAmount}_t` : `uint${this.bitAmount}_t`;
    }
}

export const booleanType = new IntegerType(false, 8);
export const characterType = new IntegerType(false, 8);

export abstract class ElementCompositeType extends ValueType {
    elementType: ItemType;
    
    constructor(elementType: ItemType) {
        super();
        this.elementType = elementType;
    }
    
    containsType(type: ItemType): boolean {
        if (!super.containsType(type)) {
            return false;
        }
        const compositeType = type as ElementCompositeType;
        return this.elementType.containsType(compositeType.elementType);
    }
    
    intersectsHelper(type: ItemType): boolean {
        if (!super.intersectsHelper(type)) {
            return false;
        }
        const compositeType = type as ElementCompositeType;
        return this.elementType.intersectsWithType(compositeType.elementType);
    }
}

export class PointerType extends ElementCompositeType {
    size: number;
    
    // size is the size of the pointer, not the referenced type.
    constructor(elementType: ItemType, size: number) {
        super(elementType);
        this.size = size;
    }
    
    getSize(): number {
        return this.size;
    }
    
    getDisplayString(): string {
        return `ptrT(${this.elementType.getDisplayString()})`;
    }
}

export class ArrayType extends ElementCompositeType {
    length: number;
    
    constructor(elementType: ItemType, length: number = null) {
        super(elementType);
        this.length = length;
    }
    
    getSize(): number {
        if (this.length === null) {
            return null;
        }
        const elementSize = this.elementType.getSize();
        return (elementSize === null) ? null : elementSize * this.length;
    }
    
    containsType(type: ItemType): boolean {
        if (!super.containsType(type)) {
            return false;
        }
        const arrayType = type as ArrayType;
        return (this.length === null || this.length === arrayType.length);
    }
    
    intersectsHelper(type: ItemType): boolean {
        if (!super.intersectsHelper(type)) {
            return false;
        }
        const arrayType = type as ArrayType;
        return (this.length === null || arrayType.length === null
            || this.length === arrayType.length);
    }
    
    getDisplayString(): string {
        const typeDisplayString = this.elementType.getDisplayString();
        if (this.length === null) {
            return `softArrayT(${typeDisplayString})`;
        } else {
            return `arrayT(${typeDisplayString}, ${this.length})`;
        }
    }
}

export class FieldNameType extends ArrayType {
    fieldsType: FieldsType;
    
    constructor(fieldsType: FieldsType) {
        super(characterType);
        this.fieldsType = fieldsType;
    }
    
    containsType(type: ItemType): boolean {
        if (!super.containsType(type)) {
            return false;
        }
        const nameType = type as FieldNameType;
        const fieldsType1 = this.fieldsType;
        const fieldsType2 = nameType.fieldsType;
        if (fieldsType1.isSoft) {
            return true;
        }
        if (fieldsType2.isSoft) {
            return false;
        }
        for (const name in fieldsType2.fieldMap) {
            if (!(name in fieldsType1.fieldMap)) {
                return false;
            }
        }
        return true;
    }
    
    intersectsHelper(type: ItemType): boolean {
        if (!super.intersectsHelper(type)) {
            return false;
        }
        const nameType = type as FieldNameType;
        const fieldsType1 = this.fieldsType;
        const fieldsType2 = nameType.fieldsType;
        if (fieldsType1.isSoft || fieldsType2.isSoft) {
            return true;
        }
        for (const name in fieldsType1.fieldMap) {
            if (name in fieldsType2.fieldMap) {
                return true;
            }
        }
        return false;
    }
    
    getDisplayString(): string {
        const typeDisplayString = this.fieldsType.getDisplayString();
        return `fieldNameT(${typeDisplayString})`;
    }
}

export type FieldsTypeConstructor<T extends FieldsType> = new (
    name: string,
    isSoft: boolean,
    fields: ResolvedField[],
) => T;

export abstract class FieldsType extends ValueType {
    name: string;
    isSoft: boolean;
    fieldList: ResolvedField[];
    fieldMap: { [name: string]: ResolvedField };
    size: number;
    
    constructor(name: string, isSoft: boolean, fields: ResolvedField[]) {
        super();
        this.name = name;
        this.isSoft = isSoft;
        this.fieldList = fields;
        this.fieldMap = {};
        let shouldPopulateFieldOffsets = true;
        this.fieldList.forEach((field) => {
            this.fieldMap[field.name] = field;
            if (field.getSize() === null) {
                shouldPopulateFieldOffsets = false;
            }
        });
        this.size = null;
        if (shouldPopulateFieldOffsets) {
            let nextOffset = 0;
            let maximumOffset = 0;
            this.fieldList.forEach((field) => {
                const offset = nextOffset;
                field.registerOffset(offset);
                const fieldSize = field.getSize();
                maximumOffset = Math.max(maximumOffset, offset + fieldSize);
                nextOffset = this.getNextFieldOffset(offset, fieldSize);
            });
            if (!this.isSoft) {
                this.size = maximumOffset;
            }
        }
    }
    
    abstract getNextFieldOffset(offset: number, fieldSize: number): number;
    
    getSize(): number {
        return this.size;
    }
    
    checkFieldTypes(
        fieldsType: FieldsType,
        checkTypes: (type1: ItemType, type2: ItemType) => boolean,
    ): boolean {
        const fieldMap1 = this.fieldMap;
        const fieldMap2 = fieldsType.fieldMap;
        if (!this.isSoft) {
            for (const name in fieldMap1) {
                if (!(name in fieldMap2)) {
                    return false;
                }
            }
        }
        for (const name in fieldMap2) {
            const field1 = fieldMap1[name];
            const field2 = fieldMap2[name];
            if (typeof field1 === "undefined") {
                if (!this.isSoft) {
                    return false;
                }
            } else if (!checkTypes(field1.type, field2.type)) {
                return false;
            }
        }
        return true;
    }
    
    containsType(type: ItemType): boolean {
        if (!super.containsType(type)) {
            return false;
        }
        const fieldsType = type as FieldsType;
        if (!this.isSoft && fieldsType.isSoft) {
            return false;
        }
        return this.checkFieldTypes(fieldsType, (type1, type2) => type1.containsType(type2));
    }
    
    intersectsHelper(type: ItemType): boolean {
        if (!super.intersectsHelper(type)) {
            return false;
        }
        const fieldsType = type as FieldsType;
        return this.checkFieldTypes(
            fieldsType,
            (type1, type2) => type1.intersectsWithType(type2),
        );
    }
    
    getDisplayString(): string {
        return this.name;
    }
}

export class StructType extends FieldsType {
    
    matchesFieldOrder(structType: StructType): boolean {
        const fieldList1 = this.fieldList;
        const fieldList2 = structType.fieldList;
        const endIndex = Math.min(fieldList1.length, fieldList2.length);
        for (let index = 0; index < endIndex; index++) {
            const field1 = fieldList1[index];
            const field2 = fieldList2[index];
            if (field1.name !== field2.name) {
                return false;
            }
        }
        return true;
    }
    
    containsType(type: ItemType): boolean {
        if (!super.containsType(type)) {
            return false;
        }
        const structType = type as StructType;
        return this.matchesFieldOrder(structType);
    }
    
    intersectsHelper(type: ItemType): boolean {
        if (!super.intersectsHelper(type)) {
            return false;
        }
        const structType = type as StructType;
        return this.matchesFieldOrder(structType);
    }
    
    getNextFieldOffset(offset: number, fieldSize: number): number {
        return offset + fieldSize;
    }
}

export const structType = new StructType("structT", true, []);

export class UnionType extends FieldsType {
    
    getNextFieldOffset(offset: number, fieldSize: number): number {
        return 0;
    }
}

export const unionType = new UnionType("unionT", true, []);

export class FunctionType extends ValueType {
    signature: FunctionSignature;
    
    constructor(signature: FunctionSignature) {
        super();
        this.signature = signature;
    }
    
    getSize(): number {
        return this.signature.targetLanguage.pointerSize;
    }
    
    containsType(type: ItemType): boolean {
        if (!super.containsType(type)) {
            return false;
        }
        const functionType = type as FunctionType;
        const signature1 = this.signature;
        const signature2 = functionType.signature;
        const argTypes1 = signature1.getArgTypes();
        const argTypes2 = signature2.getArgTypes();
        if (signature1.isSoft) {
            if (argTypes1.length > argTypes2.length) {
                return false;
            }
        } else {
            if (signature2.isSoft) {
                return false;
            }
            if (argTypes1.length !== argTypes2.length) {
                return false;
            }
        }
        return signature1.checkTypes(signature2, (type1, type2) => type1.containsType(type2));
    }
    
    intersectsHelper(type: ItemType): boolean {
        if (!super.intersectsHelper(type)) {
            return false;
        }
        const functionType = type as FunctionType;
        const signature1 = this.signature;
        const signature2 = functionType.signature;
        const argTypes1 = signature1.getArgTypes();
        const argTypes2 = signature2.getArgTypes();
        if (!signature1.isSoft && argTypes1.length < argTypes2.length) {
            return false;
        }
        if (!signature2.isSoft && argTypes2.length < argTypes1.length) {
            return false;
        }
        return signature1.checkTypes(
            signature2,
            (type1, type2) => type1.intersectsWithType(type2),
        );
    }
    
    getDisplayString(): string {
        // TODO: Implement.
        return null;
    }
}

constructors.TypeType = TypeType;


