
import { ResolvedField } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { CompilerError } from "./compilerError.js";
import { CompItem } from "./compItem.js";
import { FunctionSignature } from "./functionSignature.js";

export class ItemType extends CompItem {
    
    getType(): TypeType {
        return new TypeType(this);
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

export class ElementCompositeType extends ValueType {
    type: ItemType;
    
    constructor(type: ItemType) {
        super();
        this.type = type;
    }
}

export class PointerType extends ElementCompositeType {
    
    getDisplayString(): string {
        return `ptrT(${this.type.getDisplayString()})`;
    }
}

export class ArrayType extends ElementCompositeType {
    length: number;
    
    constructor(type: ItemType, length: number = null) {
        super(type);
        this.length = length;
    }
    
    getDisplayString(): string {
        const typeDisplayString = this.type.getDisplayString();
        if (this.length === null) {
            return `softArrayT(${typeDisplayString})`;
        } else {
            return `arrayT(${typeDisplayString}, ${this.length})`;
        }
    }
}

export type FieldsTypeConstructor<T extends FieldsType> = new (
    name: string,
    fields: ResolvedField[],
) => T;

export abstract class FieldsType extends ValueType {
    name: string;
    fields: ResolvedField[];
    nameTypeMap: { [name: string]: ItemType };
    
    constructor(name: string, fields: ResolvedField[]) {
        super();
        this.name = name;
        this.fields = fields;
        this.nameTypeMap = {};
        this.fields.forEach((field) => {
            this.nameTypeMap[field.name] = field.type;
        });
    }
    
    getDisplayString(): string {
        return this.name;
    }
}

export class StructType extends FieldsType {
    
}

export class UnionType extends FieldsType {
    
}

export class FunctionType extends ValueType {
    signature: FunctionSignature;
    
    constructor(signature: FunctionSignature) {
        super();
        this.signature = signature;
    }
    
    getDisplayString(): string {
        // TODO: Implement.
        return null;
    }
}


