
import { ItemType } from "./itemType.js";

export abstract class ManipulationType extends ItemType {
    
}

export class NotType extends ManipulationType {
    type: ItemType;
    
    constructor(type: ItemType) {
        super();
        this.type = type;
    }
    
    getDisplayString(): string {
        return `~(${this.type.getDisplayString()})`;
    }
}

export abstract class BinaryType extends ManipulationType {
    type1: ItemType;
    type2: ItemType;
    
    constructor(type1: ItemType, type2: ItemType) {
        super();
        this.type1 = type1;
        this.type2 = type2;
    }
    
    abstract getOperatorText(): string;
    
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

export class XorType extends BinaryType {
    
    getOperatorText(): string {
        return "^";
    }
}


