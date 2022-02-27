
import { Displayable } from "../interfaces.js";
import { CompilerError } from "../compilerError.js";
import { ItemType } from "./itemType.js";
import { BasicType } from "./basicType.js";

export abstract class CompItem implements Displayable {
    
    abstract getType(): ItemType;
    
    abstract getDisplayString(): string;
    
    convertToBoolean(): boolean {
        throw new CompilerError(`Cannot convert ${this.getDisplayString()} to boolean.`);
    }
    
    convertToUnixC(): string {
        throw new CompilerError(`Cannot convert ${this.getDisplayString()} to Unix C.`);
    }
}

// Represents an item which is unknown, but has a known type.
// Note that the type must be completely known, and cannot
// represent a strict superset of the fully resolved type.
// As a result, the type cannot be TypeType, because in that
// case type.type would be known.
export class CompUnknown extends CompItem {
    type: ItemType;
    
    constructor(type: ItemType) {
        super();
        this.type = type;
    }
    
    getType(): ItemType {
        return this.type;
    }
    
    getDisplayString(): string {
        return `???:${this.type.getDisplayString()}`;
    }
}

export abstract class CompKnown extends CompItem {
    
    // Assumes that this.getType().canCastToType(type) is true.
    castToType(type: ItemType): CompKnown {
        const basicType = type.getBasicTypes()[0];
        return this.castToBasicType(basicType);
    }
    
    castToBasicType(type: BasicType): CompKnown {
        throw new CompilerError("Cast method is not implemented for this class.");
    }
}


