
import { constructors } from "../constructors.js";
import { CompItem } from "./compItem.js";
import { TypeType } from "./basicType.js";

export class ItemType extends CompItem {
    
    getType(): TypeType {
        return new constructors.TypeType(this);
    }
    
    getSize(): number {
        return null;
    }
    
    containsType(type: ItemType): boolean {
        return (type instanceof this.constructor);
    }
    
    conformsToType(type: ItemType): boolean {
        return type.containsType(this);
    }
    
    // Should return false if any superclass returns false.
    intersectsHelper(type: ItemType): boolean {
        return (type instanceof this.constructor);
    }
    
    // Override intersectsHelper to control behavior of subclasses.
    intersectsWithType(type: ItemType): boolean {
        if (this.containsType(type) || type.containsType(this)) {
            return true;
        }
        return this.intersectsHelper(type);
    }
    
    equalsType(type: ItemType): boolean {
        return this.containsType(type) && type.containsType(this);
    }
    
    getDisplayString(): string {
        return "itemT";
    }
}


