
import { constructors } from "../constructors.js";
import { CompilerError } from "../compilerError.js";
import * as typeUtils from "./typeUtils.js";
import { CompKnown } from "./compItem.js";
import { BasicType, TypeType } from "./basicType.js";
import { StorageType, CompType } from "./storageType.js";

export class ItemType extends CompKnown<TypeType> {
    
    getType(): TypeType {
        return new constructors.TypeType(this);
    }
    
    getSize(): number {
        return null;
    }
    
    copy(): ItemType {
        return new ItemType();
    }
    
    clearTypeStorageTypes(): void {
        // Do nothing.
    }
    
    addTypeStorageType(type: StorageType): void {
        const compType = new constructors.CompType();
        if (!compType.conformsToType(type)) {
            throw new CompilerError("typeT must conform to compT.");
        }
    }
    
    // The union of all elements in the output
    // is equal to this item type.
    getBasicTypes(): BasicType[] {
        return [new constructors.BasicType()];
    }
    
    containsType(type: ItemType): boolean {
        const basicTypes1 = this.getBasicTypes();
        const basicTypes2 = type.getBasicTypes();
        return basicTypes2.every((basicType2) => (
            basicTypes1.some((basicType1) => basicType1.containsBasicType(basicType2))
        ));
    }
    
    conformsToType(type: ItemType): boolean {
        return type.containsType(this);
    }
    
    intersectTypeHelper(type: ItemType): BasicType[] {
        const output: BasicType[] = [];
        this.getBasicTypes().forEach((basicType1) => {
            type.getBasicTypes().forEach((basicType2) => {
                const intersectionType = basicType1.intersectBasicType(basicType2);
                if (intersectionType !== null) {
                    output.push(intersectionType);
                }
            });
        });
        return typeUtils.mergeBasicTypes(output);
    }
    
    intersectType(type: ItemType): ItemType {
        const basicTypes = this.intersectTypeHelper(type);
        if (basicTypes.length <= 0) {
            return null;
        }
        return (basicTypes as ItemType[]).reduce((accumulator, basicType) => (
            new constructors.OrType(accumulator, basicType)
        ));
    }
    
    intersectsType(type: ItemType): boolean {
        return (this.intersectType(type) !== null);
    }
    
    // Can return null if this type intersects with both concreteT and ~concreteT.
    isConcrete(): boolean {
        const concreteType = new constructors.ConcreteType();
        if (concreteType.containsType(this)) {
            return true;
        } else {
            return concreteType.intersectsType(this) ? null : false;
        }
    }
    
    equalsType(type: ItemType): boolean {
        return this.containsType(type) && type.containsType(this);
    }
    
    getBasicType(): BasicType {
        const basicTypes = this.getBasicTypes();
        if (basicTypes.length !== 1) {
            throw new CompilerError("Unexpected type union.");
        }
        return basicTypes[0];
    }
    
    getNakedBasicType(): BasicType {
        const output = this.getBasicType();
        if (output.storageTypes.length > 0) {
            throw new CompilerError("Unexpected storage type.");
        }
        return output;
    }
    
    getConversionStorageTypes(): StorageType[] {
        const basicTypes = this.getBasicTypes();
        let compType: CompType;
        basicTypes.forEach((basicType, index) => {
            const tempCompType = basicType.matchStorageType(constructors.CompType);
            if (index <= 0) {
                compType = tempCompType;
            } else {
                if ((compType === null) !== (tempCompType === null)) {
                    return null;
                }
                if (compType !== null
                        && compType.isComplement !== tempCompType.isComplement) {
                    return null;
                }
            }
        });
        return (compType === null) ? [] : [compType];
    }
    
    canConvertToType(type: ItemType): boolean {
        const basicTypes1 = this.getBasicTypes();
        const basicTypes2 = type.getBasicTypes();
        if (basicTypes2.length !== 1) {
            throw new CompilerError("Cannot convert to union of types.");
        }
        const basicType2 = basicTypes2[0];
        return basicTypes1.some((basicType1) => basicType1.canConvertToBasicType(basicType2));
    }
    
    getPointerElementType(): ItemType {
        const output = this.getBasicType().copy();
        const storageTypes = output.matchStorageTypes([
            constructors.FrameType, constructors.FixedType, constructors.ConstantType,
        ]);
        output.setStorageTypes(storageTypes);
        return output;
    }
    
    stripStorageTypes(): ItemType {
        let basicTypes = this.getBasicTypes().map((basicType) => {
            const output = basicType.copy();
            output.storageTypes = [];
            return output;
        });
        basicTypes = typeUtils.mergeBasicTypes(basicTypes);
        return (basicTypes as ItemType[]).reduce((accumulator, basicType) => (
            new constructors.OrType(accumulator, basicType)
        ));
    }
    
    andWithStorageTypes(storageTypes: StorageType[]): ItemType {
        return (storageTypes as ItemType[]).reduce((accumulator, storageType) => (
            new constructors.AndType(accumulator, storageType)
        ), this);
    }
    
    getDisplayString(): string {
        return "itemT";
    }
}


