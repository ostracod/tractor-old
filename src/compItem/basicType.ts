
import * as niceUtils from "../niceUtils.js";
import { constructors } from "../constructors.js";
import { CompilerError } from "../compilerError.js";
import { ResolvedField } from "../resolvedField.js";
import { FunctionSignature, SimpleFunctionSignature } from "../functionSignature.js";
import * as typeUtils from "./typeUtils.js";
import { ItemType } from "./itemType.js";
import { StorageType, CompType, ConcreteType } from "./storageType.js";

export class BasicType extends ItemType {
    // Excludes intrinsic storage types.
    storageTypes: StorageType[];
    
    constructor() {
        super();
        this.storageTypes = [];
    }
    
    copyHelper(): BasicType {
        return new BasicType();
    }
    
    copy(): BasicType {
        const output = this.copyHelper();
        output.storageTypes = this.storageTypes.map((type) => type.copy());
        return output;
    }
    
    getBasicTypes(): BasicType[] {
        return [this];
    }
    
    isConcrete(): boolean {
        return null;
    }
    
    getIntrinsicStorageTypes(): StorageType[] {
        const output = typeUtils.getIntrinsicStorageTypes(this.storageTypes);
        const isConcrete = this.isConcrete();
        if (isConcrete !== null) {
            output.push(new ConcreteType(!isConcrete));
        }
        return output;
    }
    
    // The intersection of all elements in this.getStorageTypes()
    // describes the storage type of this basic type.
    getStorageTypes(): StorageType[] {
        const output = this.getIntrinsicStorageTypes();
        niceUtils.extendList(output, this.storageTypes);
        return output;
    }
    
    // Should ignore all member variable values.
    containsBasicTypeClass(type: BasicType): boolean {
        return (type instanceof this.constructor);
    }
    
    // Should ignore storage types.
    containsBasicTypeHelper(type: BasicType): boolean {
        return this.containsBasicTypeClass(type);
    }
    
    // Override containsBasicTypeHelper to control behavior of subclasses.
    containsBasicType(type: BasicType): boolean {
        const result = this.containsBasicTypeHelper(type);
        if (!result) {
            return false;
        }
        const storageTypes1 = this.getStorageTypes();
        const storageTypes2 = type.getStorageTypes();
        const containsStorageTypes = storageTypes1.every((storageType1) => (
            // This only works because of certain constraints that are
            // inherent to storage types. "I have discovered a truly
            // remarkable proof of this theorem which this margin is
            // too small to contain."
            storageTypes2.some((storageType2) => (
                storageType1.containsStorageType(storageType2)
            ))
        ));
        if (!containsStorageTypes) {
            return false;
        }
        return true;
    }
    
    // this.containsBasicTypeClass(type) is true.
    intersectBasicTypeHelper(type: BasicType): BasicType {
        const output = type.copy() as BasicType;
        const storageTypes = typeUtils.mergeStorageTypes(
            [...output.storageTypes, ...this.storageTypes],
        );
        if (storageTypes === null) {
            return null;
        }
        output.storageTypes = storageTypes;
        return output;
    }
    
    // Override intersectBasicTypeHelper to control behavior of subclasses.
    intersectBasicType(type: BasicType): BasicType {
        if (this.containsBasicTypeClass(type)) {
            return this.intersectBasicTypeHelper(type);
        } else if (type.containsBasicTypeClass(this)) {
            return type.intersectBasicTypeHelper(this);
        } else {
            return null;
        }
    }
    
    canConvertToBasicType(type: BasicType): boolean {
        return false;
    }
    
    getDisplayStringHelper(): string {
        return "itemT";
    }
    
    getDisplayString(): string {
        const text = this.getDisplayStringHelper();
        if (this.storageTypes.length > 0) {
            const textList = this.storageTypes.map((type) => type.getDisplayString());
            textList.unshift(text);
            return "(" + textList.join(" & ") + ")";
        } else {
            return text;
        }
    }
}

export class TypeType extends BasicType {
    type: ItemType;
    
    constructor(type: ItemType) {
        super();
        this.type = type;
    }
    
    copyHelper(): BasicType {
        return new TypeType(this.type.copy());
    }
    
    isConcrete(): boolean {
        return false;
    }
    
    getIntrinsicStorageTypes(): StorageType[] {
        const output = super.getIntrinsicStorageTypes();
        output.push(new CompType());
        return output;
    }
    
    containsBasicTypeHelper(type: BasicType): boolean {
        if (!super.containsBasicTypeHelper(type)) {
            return false;
        }
        const typeType = type as TypeType;
        return this.type.containsType(typeType.type);
    }
    
    intersectBasicTypeHelper(type: TypeType): BasicType {
        const output = super.intersectBasicTypeHelper(type) as TypeType;
        if (output === null) {
            return null;
        }
        const tempType = this.type.intersectType(type.type);
        if (tempType === null) {
            return null;
        }
        output.type = tempType;
        return output;
    }
    
    getDisplayStringHelper(): string {
        return `typeT(${this.type.getDisplayString()})`;
    }
}

export class ValueType extends BasicType {
    
    copyHelper(): BasicType {
        return new ValueType();
    }
    
    getDisplayStringHelper(): string {
        return "valueT";
    }
}

export class VoidType extends ValueType {
    
    copyHelper(): BasicType {
        return new VoidType();
    }
    
    isConcrete(): boolean {
        return true;
    }
    
    getIntrinsicStorageTypes(): StorageType[] {
        const output = super.getIntrinsicStorageTypes();
        output.push(new CompType());
        return output;
    }
    
    getSize(): number {
        return 0;
    }
    
    getDisplayStringHelper(): string {
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
    
    copyHelper(): BasicType {
        return new IntegerType(this.isSigned, this.bitAmount);
    }
    
    getSize(): number {
        return (this.bitAmount === null) ? null : Math.ceil(this.bitAmount / 8);
    }
    
    isConcrete(): boolean {
        return (this.isSigned === null || this.bitAmount === null) ? null : true;
    }
    
    containsBasicTypeHelper(type: BasicType): boolean {
        if (!super.containsBasicTypeHelper(type)) {
            return false;
        }
        const intType = type as IntegerType;
        if (this.isSigned !== null && this.isSigned !== intType.isSigned) {
            return false;
        }
        return (this.bitAmount === null || this.bitAmount === intType.bitAmount);
    }
    
    intersectBasicTypeHelper(type: IntegerType): BasicType {
        const output = super.intersectBasicTypeHelper(type) as IntegerType;
        if (output === null) {
            return null;
        }
        if (this.isSigned !== null) {
            if (output.isSigned === null) {
                output.isSigned = this.isSigned;
            } else if (output.isSigned !== this.isSigned) {
                return null;
            }
        }
        if (this.bitAmount !== null) {
            if (output.bitAmount === null) {
                output.bitAmount = this.bitAmount;
            } else if (output.bitAmount !== this.bitAmount) {
                return null;
            }
        }
        return output;
    }
    
    canConvertToBasicType(type: BasicType): boolean {
        return (type instanceof IntegerType);
    }
    
    getDisplayStringHelper(): string {
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
    
    containsBasicTypeHelper(type: BasicType): boolean {
        if (!super.containsBasicTypeHelper(type)) {
            return false;
        }
        const compositeType = type as ElementCompositeType;
        return this.elementType.containsType(compositeType.elementType);
    }
    
    intersectBasicTypeHelper(type: ElementCompositeType): BasicType {
        const output = super.intersectBasicTypeHelper(type) as ElementCompositeType;
        if (output === null) {
            return null;
        }
        const elementType = this.elementType.intersectType(output.elementType);
        if (elementType === null) {
            return null;
        }
        output.elementType = elementType;
        return output;
    }
}

export class PointerType extends ElementCompositeType {
    size: number;
    
    // size is the size of the pointer, not the referenced type.
    constructor(elementType: ItemType, size: number) {
        super(elementType);
        this.size = size;
    }
    
    copyHelper(): BasicType {
        return new PointerType(this.elementType.copy(), this.size);
    }
    
    getSize(): number {
        return this.size;
    }
    
    isConcrete(): boolean {
        return true;
    }
    
    getDisplayStringHelper(): string {
        return `ptrT(${this.elementType.getDisplayString()})`;
    }
}

export class ArrayType extends ElementCompositeType {
    length: number;
    
    constructor(elementType: ItemType, length: number = null) {
        super(elementType);
        this.length = length;
    }
    
    copyHelper(): BasicType {
        return new ArrayType(this.elementType.copy(), this.length);
    }
    
    getSize(): number {
        if (this.length === null) {
            return null;
        }
        const elementSize = this.elementType.getSize();
        return (elementSize === null) ? null : elementSize * this.length;
    }
    
    isConcrete(): boolean {
        const isConcrete = this.elementType.isConcrete();
        if (isConcrete !== true) {
            return isConcrete;
        } else {
            return (this.length === null) ? null : true;
        }
    }
    
    containsBasicTypeHelper(type: BasicType): boolean {
        if (!super.containsBasicTypeHelper(type)) {
            return false;
        }
        const arrayType = type as ArrayType;
        return (this.length === null || this.length === arrayType.length);
    }
    
    intersectBasicTypeHelper(type: ArrayType): BasicType {
        const output = super.intersectBasicTypeHelper(type) as ArrayType;
        if (output === null) {
            return null;
        }
        if (this.length !== null) {
            if (output.length === null) {
                output.length = this.length;
            } else if (output.length !== this.length) {
                return null;
            }
        }
        return output;
    }
    
    getDisplayStringHelper(): string {
        const typeDisplayString = this.elementType.getDisplayString();
        if (this.length === null) {
            return `softArrayT(${typeDisplayString})`;
        } else {
            return `arrayT(${typeDisplayString}, ${this.length})`;
        }
    }
}

export class FieldNameType extends ArrayType {
    fieldsTypeNames: string[];
    fieldNames: Set<string>;
    
    constructor(fieldsTypeNames: string[], fieldNames: Set<string>) {
        super(characterType);
        this.fieldsTypeNames = fieldsTypeNames;
        this.fieldNames = fieldNames;
    }
    
    copyHelper(): BasicType {
        return new FieldNameType(this.fieldsTypeNames.slice(), new Set(this.fieldNames));
    }
    
    getIntrinsicStorageTypes(): StorageType[] {
        const output = super.getIntrinsicStorageTypes();
        output.push(new CompType());
        return output;
    }
    
    containsBasicTypeHelper(type: BasicType): boolean {
        if (!super.containsBasicTypeHelper(type)) {
            return false;
        }
        const nameType = type as FieldNameType;
        for (const name of nameType.fieldNames) {
            if (!this.fieldNames.has(name)) {
                return false;
            }
        }
        return true;
    }
    
    intersectBasicTypeHelper(type: FieldNameType): BasicType {
        const output = super.intersectBasicTypeHelper(type) as FieldNameType;
        if (output === null) {
            return null;
        }
        const fieldNames = new Set<string>();
        this.fieldNames.forEach((name) => {
            if (output.fieldNames.has(name)) {
                fieldNames.add(name);
            }
        });
        if (fieldNames.size <= 0) {
            return null;
        }
        const typeNames1 = this.fieldsTypeNames;
        const typeNames2 = output.fieldsTypeNames;
        typeNames1.forEach((name) => {
            if (!typeNames2.includes(name)) {
                typeNames2.push(name);
            }
        });
        return output;
    }
    
    getDisplayStringHelper(): string {
        const textList = this.fieldsTypeNames.map((name) => `fieldNameT(${name})`);
        if (textList.length > 1) {
            return `(${textList.join(" & ")})`;
        } else {
            return textList[0];
        }
    }
}

export type FieldsTypeConstructor<T extends FieldsType = FieldsType> = new (
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
        this.setFields(fields);
    }
    
    abstract getNextFieldOffset(offset: number, fieldSize: number): number;
    
    setFields(fields: ResolvedField[]): void {
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
    
    copyHelper(): BasicType {
        return new (this.constructor as FieldsTypeConstructor)(
            this.name,
            this.isSoft,
            this.fieldList.map((field) => field.copy()),
        );
    }
    
    getSize(): number {
        return this.size;
    }
    
    isConcrete(): boolean {
        let hasNullConcreteType = false;
        for (const field of this.fieldList) {
            const isConcrete = field.type.isConcrete();
            if (isConcrete === false) {
                return false;
            } else if (isConcrete === null) {
                hasNullConcreteType = true;
            }
        }
        if (hasNullConcreteType) {
            return null;
        }
        return this.isSoft ? null : true;
    }
    
    containsBasicTypeHelper(type: BasicType): boolean {
        if (!super.containsBasicTypeHelper(type)) {
            return false;
        }
        const fieldsType = type as FieldsType;
        if (!this.isSoft && fieldsType.isSoft) {
            return false;
        }
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
            } else if (!field1.contains(field2)) {
                return false;
            }
        }
        return true;
    }
    
    intersectBasicTypeHelper(type: FieldsType): BasicType {
        const output = super.intersectBasicTypeHelper(type) as FieldsType;
        if (output === null) {
            return null;
        }
        const sharedFields: ResolvedField[] = [];
        const uniqueFields: ResolvedField[] = [];
        for (const field1 of this.fieldList) {
            if (!(field1.name in output.fieldMap)) {
                if (!output.isSoft) {
                    return null;
                }
                uniqueFields.push(field1);
            }
        }
        for (const field2 of output.fieldList) {
            const field1 = this.fieldMap[field2.name];
            if (typeof field1 === "undefined") {
                if (!this.isSoft) {
                    return null;
                }
                uniqueFields.push(field2);
            } else {
                const intersectionField = field1.intersect(field2);
                if (intersectionField === null) {
                    return null;
                }
                sharedFields.push(intersectionField);
            }
        }
        output.setFields([...sharedFields, ...uniqueFields]);
        return output;
    }
    
    getDisplayStringHelper(): string {
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
    
    containsBasicTypeHelper(type: BasicType): boolean {
        if (!super.containsBasicTypeHelper(type)) {
            return false;
        }
        const structType = type as StructType;
        return this.matchesFieldOrder(structType);
    }
    
    intersectBasicTypeHelper(type: StructType): BasicType {
        const output = super.intersectBasicTypeHelper(type) as StructType;
        if (output === null) {
            return null;
        }
        if (!output.matchesFieldOrder(this) || !output.matchesFieldOrder(type)) {
            return null;
        }
        return output;
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
    
    copyHelper(): BasicType {
        return new FunctionType(this.signature);
    }
    
    isConcrete(): boolean {
        if (this.signature.isInline === true) {
            return false;
        } else if (this.signature.isInline === null || this.signature.isSoft) {
            return null;
        } else {
            return true;
        }
    }
    
    getIntrinsicStorageTypes(): StorageType[] {
        const output = super.getIntrinsicStorageTypes();
        if (this.signature.isInline === true) {
            output.push(new CompType());
        }
        return output;
    }
    
    getSize(): number {
        return this.signature.targetLanguage.pointerSize;
    }
    
    containsBasicTypeHelper(type: BasicType): boolean {
        if (!super.containsBasicTypeHelper(type)) {
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
        if (signature1.isInline !== null && signature1.isInline !== signature2.isInline) {
            return false;
        }
        return signature1.checkTypes(signature2, (type1, type2) => type1.containsType(type2));
    }
    
    intersectBasicTypeHelper(type: FunctionType): BasicType {
        const output = super.intersectBasicTypeHelper(type) as FunctionType;
        if (output === null) {
            return null;
        }
        const signature1 = this.signature;
        const signature2 = output.signature;
        let isInline: boolean;
        if (signature1.isInline !== null) {
            if (signature2.isInline !== null && signature2.isInline !== signature1.isInline) {
                return null;
            }
            isInline = signature1.isInline;
        } else {
            isInline = signature2.isInline;
        }
        const argTypes1 = signature1.getArgTypes();
        const argTypes2 = signature2.getArgTypes();
        const intersectionArgTypes: ItemType[] = [];
        const endIndex = Math.max(argTypes1.length, argTypes2.length);
        for (let index = 0; index < endIndex; index++) {
            const argType1 = argTypes1[index];
            const argType2 = argTypes2[index];
            let intersectionType: ItemType;
            if (typeof argType1 === "undefined") {
                if (!signature1.isSoft) {
                    return null;
                }
                intersectionType = argType2;
            } else if (typeof argType2 === "undefined") {
                if (!signature2.isSoft) {
                    return null;
                }
                intersectionType = argType1;
            } else {
                intersectionType = argType1.intersectType(argType2);
                if (intersectionType === null) {
                    return null;
                }
            }
            intersectionArgTypes.push(intersectionType);
        }
        const returnType1 = signature1.getReturnType();
        const returnType2 = signature2.getReturnType();
        const intersectionReturnType = returnType1.intersectType(returnType2);
        if (intersectionReturnType === null) {
            return null;
        }
        output.signature = new SimpleFunctionSignature(
            signature1.targetLanguage,
            signature1.isSoft && signature2.isSoft,
            isInline,
            intersectionArgTypes,
            intersectionReturnType,
        );
        return output;
    }
    
    getDisplayStringHelper(): string {
        // TODO: Implement.
        return null;
    }
}

export class ListType extends ValueType {
    elementTypes: ItemType[];
    
    constructor(elementTypes: ItemType[]) {
        super();
        this.elementTypes = elementTypes;
    }
    
    copyHelper(): BasicType {
        return new ListType(this.elementTypes.map((type) => type.copy()));
    }
    
    containsBasicTypeClass(type: BasicType): boolean {
        if (super.containsBasicTypeClass(type)) {
            return true;
        }
        return (type instanceof ArrayType || type instanceof StructType);
    }
    
    containsBasicTypeHelper(type: BasicType): boolean {
        if (!super.containsBasicTypeHelper(type)) {
            return false;
        }
        if (type instanceof ListType) {
            if (this.elementTypes.length !== type.elementTypes.length) {
                return false;
            }
            for (let index = 0; index < this.elementTypes.length; index++) {
                const type1 = this.elementTypes[index];
                const type2 = type.elementTypes[index];
                if (!type1.containsType(type2)) {
                    return false;
                }
            }
            return true;
        } else if (type instanceof ArrayType) {
            if (this.elementTypes.length !== type.length) {
                return false;
            }
            return this.elementTypes.every((elementType) => (
                elementType.containsType(type.elementType)
            ));
        } else if (type instanceof StructType) {
            if (type.isSoft) {
                return false;
            }
            if (this.elementTypes.length !== type.fieldList.length) {
                return false;
            }
            for (let index = 0; index < this.elementTypes.length; index++) {
                const elementType = this.elementTypes[index];
                const field = type.fieldList[index];
                if (!elementType.containsType(field.type)) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }
    
    intersectBasicTypeHelper(type: ValueType): BasicType {
        const output = super.intersectBasicTypeHelper(type);
        if (output === null) {
            return null;
        }
        if (output instanceof ListType) {
            if (this.elementTypes.length !== output.elementTypes.length) {
                return null;
            }
            for (let index = 0; index < this.elementTypes.length; index++) {
                const type1 = this.elementTypes[index];
                const type2 = output.elementTypes[index];
                const intersectionType = type1.intersectType(type2);
                if (intersectionType === null) {
                    return null;
                }
                output.elementTypes[index] = intersectionType;
            }
        } else if (output instanceof ArrayType) {
            if (output.length === null) {
                output.length = this.elementTypes.length;
            } else if (this.elementTypes.length !== output.length) {
                return null;
            }
            let intersectionType = output.elementType;
            for (const elementType of this.elementTypes) {
                intersectionType = intersectionType.intersectType(elementType);
                if (intersectionType === null) {
                    return null;
                }
            }
            output.elementType = intersectionType;
        } else if (output instanceof StructType) {
            if (this.elementTypes.length !== output.fieldList.length) {
                return null;
            }
            output.isSoft = false;
            const fields: ResolvedField[] = [];
            for (let index = 0; index < this.elementTypes.length; index++) {
                const elementType = this.elementTypes[index];
                const field = output.fieldList[index].copy();
                const intersectionType = elementType.intersectType(field.type);
                if (intersectionType === null) {
                    return null;
                }
                field.type = intersectionType;
                fields.push(field);
            }
            output.setFields(fields);
        } else {
            return null;
        }
        return output;
    }
    
    getDisplayStringHelper(): string {
        return "listT";
    }
}

constructors.BasicType = BasicType;
constructors.TypeType = TypeType;


