
import * as niceUtils from "./niceUtils.js";
import { CompilerError } from "./compilerError.js";
import { CompItem } from "./compItem.js";
import { ResolvedField } from "./resolvedField.js";
import { FunctionSignature } from "./functionSignature.js";

export class ItemType extends CompItem {
    
    getType(): TypeType {
        return new TypeType(this);
    }
    
    getSize(): number {
        return null;
    }
    
    getDisplayString(): string {
        return "itemT";
    }
}

export class TypeType extends ItemType {
    type: ItemType;
    
    constructor(type: ItemType) {
        super();
        this.type = type;
    }
    
    getDisplayString(): string {
        return `typeT(${this.type.getDisplayString()})`;
    }
}

export class ValueType extends ItemType {
    
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
    
    getDisplayString(): string {
        let term: string;
        if (this.isSigned === null) {
            term = "int";
        } else if (this.isSigned) {
            term = "sInt";
        } else {
            term = "uInt";
        }
        const suffix = (this.bitAmount == null) ? "" : this.bitAmount.toString();
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

export const characterType = new IntegerType(false, 8);

export class ElementCompositeType extends ValueType {
    elementType: ItemType;
    
    constructor(elementType: ItemType) {
        super();
        this.elementType = elementType;
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
    
    getDisplayString(): string {
        const typeDisplayString = this.fieldsType.getDisplayString();
        return `fieldNameT(${this.fieldsType.getDisplayString()})`;
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
    
    getDisplayString(): string {
        return this.name;
    }
}

export class StructType extends FieldsType {
    
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
    
    getDisplayString(): string {
        // TODO: Implement.
        return null;
    }
}

export class NotType extends ItemType {
    type: ItemType;
    
    constructor(type: ItemType) {
        super();
        this.type = type;
    }
    
    getDisplayString(): string {
        return `~(this.type.getDisplayString())`;
    }
}

export abstract class BinaryType extends ItemType {
    type1: ItemType;
    type2: ItemType;
    
    constructor(type1: ItemType, type2: ItemType) {
        super();
        this.type1 = type1;
        this.type2 = type2;
    }
    
    abstract getOperatorText(): string;
    
    getSize(): number {
        const size1 = this.type1.getSize();
        const size2 = this.type2.getSize();
        return (size1 === size2) ? size1 : null;
    }
    
    getDisplayString(): string {
        const typeText1 = this.type1.getDisplayString();
        const typeText2 = this.type2.getDisplayString();
        return `(${typeText1} ${this.getOperatorText()} ${typeText2})`;
    }
}

export class OrType extends BinaryType {
    
    getOperatorText(): string {
        return "|";
    }
}

export class AndType extends BinaryType {
    
    getOperatorText(): string {
        return "&";
    }
}

export class XorType extends BinaryType {
    
    getOperatorText(): string {
        return "^";
    }
}


