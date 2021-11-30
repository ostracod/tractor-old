
import * as niceUtils from "./niceUtils.js";
import { CompilerError } from "./compilerError.js";
import { TargetLanguage } from "./targetLanguage.js";
import { CompItem } from "./compItem.js";
import { CompInteger } from "./compValue.js";
import { ItemType, TypeType, IntegerType, ElementCompositeType, PointerType, ArrayType, FieldNameType, FieldsType, FunctionType } from "./itemType.js";

export type FunctionContextConstructor<T extends FunctionContext = FunctionContext> = new (
    targetLanguage: TargetLanguage,
    args: CompItem[],
) => T;

export abstract class FunctionContext {
    targetLanguage: TargetLanguage;
    
    constructor(targetLanguage: TargetLanguage, args: CompItem[]) {
        this.targetLanguage = targetLanguage;
        this.initialize(args);
    }
    
    abstract initialize(args: CompItem[]): void;
    
    abstract getReturnType(): ItemType;
}

export class GenericFunctionContext extends FunctionContext {
    
    initialize(args: CompItem[]): void {
        // Do nothing.
    }
    
    getReturnType(): ItemType {
        return new ItemType();
    }
}

export abstract class BuiltInFunctionContext extends FunctionContext {
    
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
    
    initialize(args: CompItem[]): void {
        const typeArg = args[0];
        if (!(typeArg instanceof ItemType)) {
            throw new CompilerError("First argument must conform to typeT(itemT).");
        }
        this.type = typeArg;
    }
}

export class PtrTFunctionContext extends TypeFunctionContext {
    
    getReturnItem(): CompItem {
        return this.targetLanguage.createPointerType(this.type);
    }
}

export class SoftArrayTFunctionContext extends TypeFunctionContext {
    length: number;
    
    initialize(args: CompItem[]): void {
        super.initialize(args);
        this.length = null;
    }
    
    getReturnItem(): CompItem {
        return new ArrayType(this.type, this.length);
    }
}

export class ArrayTFunctionContext extends SoftArrayTFunctionContext {
    
    initialize(args: CompItem[]): void {
        super.initialize(args);
        const lengthArg = args[1];
        if (!(lengthArg instanceof CompInteger)) {
            throw new CompilerError("Second argument must conform to intT.");
        }
        this.length = Number(lengthArg.value);
    }
}

export class FieldNameTFunctionContext extends BuiltInFunctionContext {
    type: FieldsType;
    
    initialize(args: CompItem[]): void {
        const typeArg = args[0];
        if (!(typeArg instanceof FieldsType)) {
            throw new CompilerError("First argument must conform to typeT(structT) or typeT(unionT).");
        }
        this.type = typeArg;
    }
    
    getReturnItem(): CompItem {
        return new FieldNameType(this.type);
    }
}

export class TypeTFunctionContext extends BuiltInFunctionContext {
    item: CompItem;
    
    initialize(args: CompItem[]): void {
        this.item = args[0];
    }
    
    getReturnItem(): CompItem {
        return this.item.getType();
    }
}

export class GetSizeFunctionContext extends TypeFunctionContext {
    
    getReturnItem(): CompItem {
        const size = this.type.getSize();
        if (size === null) {
            throw new CompilerError(`Cannot get size of ${this.type.getDisplayString()}.`);
        }
        return new CompInteger(BigInt(size), new IntegerType());
    }
}

export class GetLenFunctionContext extends BuiltInFunctionContext {
    arrayType: ArrayType;
    functionType: FunctionType;
    
    initialize(args: CompItem[]): void {
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
    
    initialize(args: CompItem[]): void {
        const typeArg = args[0];
        if (!(typeArg instanceof ElementCompositeType)) {
            throw new CompilerError("Argument must conform to ptrT or softArrayT.");
        }
        this.compositeType = typeArg;
    }
    
    getReturnItem(): CompItem {
        return this.compositeType.elementType;
    }
}


