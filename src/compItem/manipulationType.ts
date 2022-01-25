
import { constructors } from "../constructors.js";
import { CompilerError } from "../compilerError.js";
import * as typeUtils from "./typeUtils.js";
import { ItemType } from "./itemType.js";
import { StorageType } from "./storageType.js";
import { BasicType } from "./basicType.js";

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
    
    getBasicTypes(): BasicType[] {
        if (!(this.type instanceof StorageType)) {
            throw new CompilerError("Type inversion is only implemented for storage types.");
        }
        const storageType = this.type.copy();
        storageType.isComplement = !storageType.isComplement;
        const basicType = new BasicType();
        basicType.storageTypes = [storageType];
        return [basicType];
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
    
    getBasicTypes(): BasicType[] {
        const basicTypes = [...this.type1.getBasicTypes(), ...this.type2.getBasicTypes()];
        return typeUtils.mergeBasicTypes(basicTypes);
    }
    
    getOperatorText(): string {
        return "|";
    }
}

export class AndType extends BinaryType {
    
    getBasicTypes(): BasicType[] {
        return this.type1.intersectTypeHelper(this.type2);
    }
    
    getOperatorText(): string {
        return "&";
    }
}

constructors.OrType = OrType;


