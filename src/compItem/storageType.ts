
import { ItemType } from "./itemType.js";

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


