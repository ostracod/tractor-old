
import { constructors } from "./constructors.js";
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
            term = "intT";
        } else if (this.isSigned) {
            term = "sIntT";
        } else {
            term = "uIntT";
        }
        let suffix: string;
        if (this.bitAmount == null) {
            suffix = "";
        } else {
            suffix = this.bitAmount.toString();
        }
        return term + suffix;
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


