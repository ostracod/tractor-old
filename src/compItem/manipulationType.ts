
import { ItemType } from "./itemType.js";

export abstract class ManipulationType extends ItemType {
    
}

export class NotType extends ManipulationType {
    type: ItemType;
    
    constructor(type: ItemType) {
        super();
        this.type = type;
    }
    
    copy(): ItemType {
        return new NotType(this.type.copy());
    }
    
    getDisplayString(): string {
        return `~(${this.type.getDisplayString()})`;
    }
}

export type BinaryTypeConstructor<T extends BinaryType = BinaryType> = new (
    type1: ItemType,
    type2: ItemType,
) => T;

export abstract class BinaryType extends ManipulationType {
    type1: ItemType;
    type2: ItemType;
    
    constructor(type1: ItemType, type2: ItemType) {
        super();
        this.type1 = type1;
        this.type2 = type2;
    }
    
    abstract getOperatorText(): string;
    
    copy(): ItemType {
        return new (this.constructor as BinaryTypeConstructor)(
            this.type1.copy(),
            this.type2.copy(),
        );
    }
    
    getSize(): number {
        const size1 = this.type1.getSize();
        const size2 = this.type2.getSize();
        return (size1 === size2) ? size1 : null;
    }
    
    getDisplayString(): string {
        const typeText1 = this.type1.getDisplayString();
        const typeText2 = this.type2.getDisplayString();
        return `(${typeText1} ${this.getOperatorText()} ${typeText2})`;
    }
}

export class OrType extends BinaryType {
    
    getOperatorText(): string {
        return "|";
    }
}

export class AndType extends BinaryType {
    
    getOperatorText(): string {
        return "&";
    }
}


