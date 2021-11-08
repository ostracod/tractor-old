
import { Displayable } from "./interfaces.js";
import { CompilerError } from "./compilerError.js";
import { ItemType } from "./itemType.js";

export abstract class CompItem implements Displayable {
    
    abstract getType(): ItemType;
    
    abstract getDisplayString(): string;
    
    convertToBoolean(): boolean {
        throw new CompilerError(`Cannot convert ${this.getDisplayString()} to boolean.`);
    }
    
    convertToUnixC(): string {
        throw new CompilerError(`Cannot convert ${this.getDisplayString()} to Unix C.`);
    }
}


