
import { ItemType } from "./itemType.js";
import { BasicType } from "./basicType.js";

export type StorageTypeConstructor<T extends StorageType = StorageType> = new (
    isComplement?: boolean,
) => T;

export abstract class StorageType extends ItemType {
    isComplement: boolean;
    
    constructor(isComplement = false) {
        super();
        this.isComplement = isComplement;
    }
    
    abstract getDisplayStringHelper(): string;
    
    copy(): StorageType {
        return new (this.constructor as StorageTypeConstructor)(this.isComplement);
    }
    
    getBasicTypes(): BasicType[] {
        const basicType = new BasicType();
        basicType.storageTypes = [this];
        return [basicType];
    }
    
    // Does not take intrinsic storage types into account.
    containsStorageType(type: StorageType): boolean {
        if (type instanceof this.constructor) {
            return (!this.isComplement && !type.isComplement);
        } else if (this instanceof type.constructor) {
            return (this.isComplement && type.isComplement);
        } else {
            return false;
        }
    }
    
    // Does not take intrinsic storage types into account.
    intersectsStorageType(type: StorageType): boolean {
        if (type instanceof this.constructor) {
            return (!this.isComplement || type.isComplement);
        } else if (this instanceof type.constructor) {
            return (this.isComplement || !type.isComplement);
        } else {
            return true;
        }
    }
    
    getDisplayString(): string {
        let output = this.getDisplayStringHelper();
        if (this.isComplement) {
            output = "~" + output;
        }
        return output;
    }
}

export class ConstantType extends StorageType {
    
    getDisplayStringHelper(): string {
        return "constT";
    }
}

export class CompType extends ConstantType {
    
    getDisplayStringHelper(): string {
        return "compT";
    }
}

export class ConcreteType extends StorageType {
    
    getDisplayStringHelper(): string {
        return "concreteT";
    }
}

export class LocationType extends ConcreteType {
    
    getDisplayStringHelper(): string {
        return "locT";
    }
}

export class CompLocationType extends LocationType {
    
    getDisplayStringHelper(): string {
        return "compLocT";
    }
}

export class FrameType extends LocationType {
    
    getDisplayStringHelper(): string {
        return "frameT";
    }
}

export class FixedType extends LocationType {
    
    getDisplayStringHelper(): string {
        return "fixedT";
    }
}

export const storageTypeConstructors: StorageTypeConstructor[] = [
    ConstantType, CompType, ConcreteType, LocationType,
    CompLocationType, FrameType, FixedType,
];


