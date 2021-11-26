
import * as niceUtils from "./niceUtils.js";
import { CompilerError } from "./compilerError.js";
import { CompItem } from "./compItem.js";
import { CompInteger } from "./compValue.js";
import { ItemType, TypeType, IntegerType, ElementCompositeType, PointerType, ArrayType, FunctionType } from "./itemType.js";

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

abstract class TypeFunctionContext extends BuiltInFunctionContext {
    type: ItemType;
    
    constructor(args: CompItem[]) {
        super(args);
        const typeArg = args[0];
        if (!(typeArg instanceof ItemType)) {
            throw new CompilerError("First argument must conform to typeT(itemT).");
        }
        this.type = typeArg;
    }
}

export class PtrTFunctionContext extends TypeFunctionContext {
    
    getReturnItem(): CompItem {
        return new PointerType(this.type);
    }
}

export class SoftArrayTFunctionContext extends TypeFunctionContext {
    length: number;
    
    constructor(args: CompItem[]) {
        super(args);
        this.length = null;
    }
    
    getReturnItem(): CompItem {
        return new ArrayType(this.type, this.length);
    }
}

export class ArrayTFunctionContext extends SoftArrayTFunctionContext {
    
    constructor(args: CompItem[]) {
        super(args);
        const lengthArg = args[1];
        if (!(lengthArg instanceof CompInteger)) {
            throw new CompilerError("Second argument must conform to intT.");
        }
        this.length = Number(lengthArg.value);
    }
}

export class TypeTFunctionContext extends BuiltInFunctionContext {
    item: CompItem;
    
    constructor(args: CompItem[]) {
        super(args);
        this.item = args[0];
    }
    
    getReturnItem(): CompItem {
        return this.item.getType();
    }
}

export class GetLenFunctionContext extends BuiltInFunctionContext {
    arrayType: ArrayType;
    functionType: FunctionType;
    
    constructor(args: CompItem[]) {
        super(args);
        const arg = args[0];
        if (arg instanceof ArrayType) {
            if (arg.length === null) {
                throw new CompilerError("Cannot get length of softArrayT.");
            }
            this.arrayType = arg;
            this.functionType = null;
        } else if (arg instanceof FunctionType) {
            this.functionType = arg;
            this.arrayType = null;
        } else {
            throw new CompilerError("Argument must conform to arrayT or funcT.");
        }
    }
    
    getReturnItem(): CompItem {
        let length: number;
        if (this.arrayType !== null) {
            length = this.arrayType.length;
        } else {
            const argTypes = this.functionType.signature.getArgTypes();
            length = argTypes.length;
        }
        return new CompInteger(BigInt(length), new IntegerType());
    }
}

export class GetElemTypeFunctionContext extends BuiltInFunctionContext {
    compositeType: ElementCompositeType;
    
    constructor(args: CompItem[]) {
        super(args);
        const typeArg = args[0];
        if (!(typeArg instanceof ElementCompositeType)) {
            throw new CompilerError("Argument must conform to ptrT or softArrayT.");
        }
        this.compositeType = typeArg;
    }
    
    getReturnItem(): CompItem {
        return this.compositeType.type;
    }
}


