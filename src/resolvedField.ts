
import { ItemType } from "./itemType.js";

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
}

export class DataField extends ResolvedField {
    
    getSize(): number {
        return this.type.getSize();
    }
}

export class TypeField extends ResolvedField {
    
    getSize(): number {
        return 0;
    }
}


