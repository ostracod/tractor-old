
import { ItemType } from "./compItem/itemType.js";

export type ResolvedFieldConstructor<T extends ResolvedField = ResolvedField> = new (
    name: string,
    type: ItemType,
) => T;

export abstract class ResolvedField {
    name: string;
    type: ItemType;
    
    constructor(name: string, type: ItemType) {
        this.name = name;
        this.type = type;
    }
    
    abstract getSize(): number;
    
    copy(): ResolvedField {
        return new (this.constructor as ResolvedFieldConstructor)(
            this.name,
            this.type.copy(),
        );
    }
    
    registerOffset(offset: number): void {
        // Do nothing.
    }
}

export class DataField extends ResolvedField {
    offset: number;
    
    constructor(name: string, type: ItemType) {
        super(name, type);
        this.offset = null;
    }
    
    getSize(): number {
        return this.type.getSize();
    }
    
    registerOffset(offset: number): void {
        this.offset = offset;
    }
}

export class TypeField extends ResolvedField {
    
    getSize(): number {
        return 0;
    }
}


