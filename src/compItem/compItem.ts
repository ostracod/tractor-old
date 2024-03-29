
import { constructors } from "../constructors.js";
import { Displayable } from "../interfaces.js";
import { CompilerError } from "../compilerError.js";
import { ItemType } from "./itemType.js";
import { BasicType } from "./basicType.js";
import { StorageType } from "./storageType.js";

export abstract class CompItem<T extends ItemType = ItemType> implements Displayable {
    
    abstract copy(): CompItem;
    
    abstract getType(): T;
    
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
export class CompUnknown<T extends ItemType = ItemType> extends CompItem<T> {
    type: T;
    
    constructor(type: T) {
        super();
        this.type = type;
    }
    
    copy(): CompUnknown {
        return new CompUnknown(this.type.copy());
    }
    
    getType(): T {
        return this.type;
    }
    
    getDisplayString(): string {
        return `???:${this.type.getDisplayString()}`;
    }
}

export abstract class CompKnown<T extends ItemType = ItemType> extends CompItem<T> {
    
    abstract copy(): CompKnown;
    
    abstract addTypeStorageType(type: StorageType): void;
    
    // May remove compT from storage types.
    abstract clearTypeStorageTypes(): void;
    
    enforceTypeCompType(): void {
        this.addTypeStorageType(new constructors.CompType());
    }
    
    setTypeStorageTypes(types: StorageType[]): void {
        this.clearTypeStorageTypes();
        types.forEach((type) => {
            this.addTypeStorageType(type);
        });
        this.enforceTypeCompType();
    }
    
    // Assumes that this.getType().canConvertToType(type) is true.
    convertToType(type: ItemType): CompKnown {
        const basicType = type.getBasicTypes()[0];
        return this.convertToBasicType(basicType);
    }
    
    convertToBasicType(type: BasicType): CompKnown {
        throw new CompilerError("Conversion method is not implemented for this class.");
    }
}


