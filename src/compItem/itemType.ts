
import { constructors } from "../constructors.js";
import * as typeUtils from "./typeUtils.js";
import { CompItem } from "./compItem.js";
import { BasicType, TypeType } from "./basicType.js";

export class ItemType extends CompItem {
    
    getType(): TypeType {
        return new constructors.TypeType(this);
    }
    
    getSize(): number {
        return null;
    }
    
    copy(): ItemType {
        return new ItemType();
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
        let output: BasicType[] = [];
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
    
    equalsType(type: ItemType): boolean {
        return this.containsType(type) && type.containsType(this);
    }
    
    getDisplayString(): string {
        return "itemT";
    }
}


