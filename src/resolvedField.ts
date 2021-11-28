
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
}

export class DataField extends ResolvedField {
    
}

export class TypeField extends ResolvedField {
    
}


