
import * as niceUtils from "./niceUtils.js";
import { CompilerError } from "./compilerError.js";
import { CompItem } from "./compItem.js";
import { CompInteger } from "./compValue.js";
import { ItemType, TypeType, ArrayType } from "./itemType.js";

export type BuiltInFunctionContextConstructor<T extends BuiltInFunctionContext = BuiltInFunctionContext> = new (args: CompItem[]) => T;

export abstract class BuiltInFunctionContext {
    
    constructor(args: CompItem[]) {
        // Do nothing.
    }
    
    abstract getReturnItem(): CompItem;
    
    getReturnType(): ItemType {
        // The assumption is that getReturnItem never has any
        // side-effects. If this is false, then subclasses of
        // BuiltInFunctionContext should override getReturnType.
        return this.getReturnItem().getType();
    }
}

export class ArrayTFunctionContext extends BuiltInFunctionContext {
    type: ItemType;
    length: number;
    
    constructor(args: CompItem[]) {
        super(args);
        const typeArg = args[0];
        const lengthArg = args[1];
        if (!(typeArg instanceof ItemType)) {
            throw new CompilerError("First argument must conform to typeT(itemT).");
        }
        if (!(lengthArg instanceof CompInteger)) {
            throw new CompilerError("Second argument must conform to intT.");
        }
        this.type = typeArg;
        this.length = Number(lengthArg.value);
    }
    
    getReturnItem(): CompItem {
        return new ArrayType(this.type, this.length);
    }
}


