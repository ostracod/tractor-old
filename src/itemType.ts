
import { constructors } from "./constructors.js";
import { CompilerError } from "./compilerError.js";
import { CompItem } from "./compItem.js";
import { FunctionTypeDefinition } from "./typeDefinition.js";

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
    
    convertToUnixC(): string {
        if (this.isSigned === null || this.bitAmount === null) {
            throw new CompilerError("Expected concrete type.");
        }
        return (this.isSigned) ? `int${this.bitAmount}_t` : `uint${this.bitAmount}_t`;
    }
}

export class ArrayType extends ValueType {
    type: ItemType;
    length: number;
    
    constructor(type: ItemType, length: number = null) {
        super();
        this.type = type;
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

export class FunctionHandleType extends ValueType {
    functionTypeDefinition: FunctionTypeDefinition;
    
    constructor(functionTypeDefinition: FunctionTypeDefinition) {
        super();
        this.functionTypeDefinition = functionTypeDefinition;
    }
    
    getDisplayString(): string {
        return this.functionTypeDefinition.identifier.getDisplayString();
    }
}

constructors.ItemType = ItemType;
constructors.IntegerType = IntegerType;
constructors.ArrayType = ArrayType;


