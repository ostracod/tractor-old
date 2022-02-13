
import { CompilerError } from "./compilerError.js";
import { TargetLanguage } from "./targetLanguage.js";
import { CompItem } from "./compItem/compItem.js";
import { CompInteger, CompArray, BuiltInFunctionHandle } from "./compItem/compValue.js";
import { ItemType } from "./compItem/itemType.js";
import { TypeType, ValueType, IntegerType, booleanType, characterType, ElementCompositeType, ArrayType, FieldNameType, FieldsType, StructType, structType, unionType, FunctionType } from "./compItem/basicType.js";
import { OrType } from "./compItem/manipulationType.js";
import { ResolvedField, DataField } from "./resolvedField.js";

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

export abstract class ReturnItemFunctionContext extends FunctionContext {
    
    abstract getReturnItem(): CompItem;
    
    getReturnType(): ItemType {
        // The assumption is that getReturnItem never has any side-effects
        // If this is false, then subclasses of ReturnItemFunctionContext
        // should override getReturnType.
        return this.getReturnItem().getType();
    }
}

abstract class TypeFunctionContext extends ReturnItemFunctionContext {
    type: ItemType;
    
    initialize(args: CompItem[]): void {
        const typeArg = args[0];
        if (!(typeArg instanceof ItemType)) {
            throw new CompilerError("First argument must conform to typeT(itemT).");
        }
        this.type = typeArg;
    }
}

class PtrTFunctionContext extends TypeFunctionContext {
    
    getReturnItem(): CompItem {
        return this.targetLanguage.createPointerType(this.type);
    }
}

class SoftArrayTFunctionContext extends TypeFunctionContext {
    length: number;
    
    initialize(args: CompItem[]): void {
        super.initialize(args);
        this.length = null;
    }
    
    getReturnItem(): CompItem {
        return new ArrayType(this.type, this.length);
    }
}

class ArrayTFunctionContext extends SoftArrayTFunctionContext {
    
    initialize(args: CompItem[]): void {
        super.initialize(args);
        const lengthArg = args[1];
        if (!(lengthArg instanceof CompInteger)) {
            throw new CompilerError("Second argument must conform to intT.");
        }
        this.length = Number(lengthArg.value);
    }
}

class FieldNameTFunctionContext extends ReturnItemFunctionContext {
    type: FieldsType;
    
    initialize(args: CompItem[]): void {
        const typeArg = args[0];
        if (!(typeArg instanceof FieldsType)) {
            throw new CompilerError("First argument must conform to typeT(structT) or typeT(unionT).");
        }
        this.type = typeArg;
    }
    
    getReturnItem(): CompItem {
        const fieldNames = this.type.fieldList.map((field) => field.name);
        return new FieldNameType([this.type.name], new Set(fieldNames));
    }
}

class TypeTFunctionContext extends ReturnItemFunctionContext {
    item: CompItem;
    
    initialize(args: CompItem[]): void {
        this.item = args[0];
    }
    
    getReturnItem(): CompItem {
        return this.item.getType();
    }
}

class GetSizeFunctionContext extends TypeFunctionContext {
    
    getReturnItem(): CompItem {
        const size = this.type.getSize();
        if (size === null) {
            throw new CompilerError(`Cannot get size of ${this.type.getDisplayString()}.`);
        }
        return new CompInteger(BigInt(size));
    }
}

class GetLenFunctionContext extends ReturnItemFunctionContext {
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
            throw new CompilerError("Argument must conform to typeT(arrayT) or typeT(funcT).");
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
        return new CompInteger(BigInt(length));
    }
}

class GetElemTypeFunctionContext extends ReturnItemFunctionContext {
    compositeType: ElementCompositeType;
    
    initialize(args: CompItem[]): void {
        const typeArg = args[0];
        if (!(typeArg instanceof ElementCompositeType)) {
            throw new CompilerError("Argument must conform to typeT(ptrT) or typeT(softArrayT).");
        }
        this.compositeType = typeArg;
    }
    
    getReturnItem(): CompItem {
        return this.compositeType.elementType;
    }
}

abstract class FieldFunctionContext extends ReturnItemFunctionContext {
    field: ResolvedField;
    
    verifyTypeArg(arg: CompItem): FieldsType {
        if (!(arg instanceof FieldsType)) {
            throw new CompilerError("First argument must conform to typeT(structT) or typeT(unionT).");
        }
        return arg;
    }
    
    initialize(args: CompItem[]): void {
        const typeArg = args[0];
        const fieldsType = this.verifyTypeArg(typeArg);
        const nameArg = args[1];
        if (!(nameArg instanceof CompArray)) {
            throw new CompilerError("Second argument must conform to arrayT(uInt8T).");
        }
        const name = nameArg.convertToString();
        this.field = fieldsType.fieldMap[name];
        if (typeof this.field === "undefined") {
            throw new CompilerError("Second argument must be field name of first argument.");
        }
    }
}

class GetFieldTypeFunctionContext extends FieldFunctionContext {
    
    getReturnItem(): CompItem {
        return this.field.type;
    }
}

class GetFieldOffsetFunctionContext extends FieldFunctionContext {
    dataField: DataField;
    
    verifyTypeArg(arg: CompItem): FieldsType {
        if (!(arg instanceof StructType)) {
            throw new CompilerError("First argument must conform to typeT(structT).");
        }
        return arg;
    }
    
    initialize(args: CompItem[]): void {
        super.initialize(args);
        const { field } = this;
        if (!(field instanceof DataField)) {
            throw new CompilerError("Field must be a data field.");
        }
        this.dataField = field;
    }
    
    getReturnItem(): CompItem {
        const { offset } = this.dataField;
        if (offset === null) {
            throw new CompilerError("Field does not have a known offset.");
        }
        return new CompInteger(BigInt(offset));
    }
}

abstract class FunctionTypeFunctionContext extends ReturnItemFunctionContext {
    functionType: FunctionType;
    
    initialize(args: CompItem[]): void {
        const typeArg = args[0];
        if (!(typeArg instanceof FunctionType)) {
            throw new CompilerError("First argument must conform to typeT(funcT).");
        }
        this.functionType = typeArg;
    }
}

class GetArgTypeFunctionContext extends FunctionTypeFunctionContext {
    index: number;
    
    initialize(args: CompItem[]): void {
        super.initialize(args);
        const indexArg = args[1];
        if (!(indexArg instanceof CompInteger)) {
            throw new CompilerError("Second argument must conform to intT.");
        }
        this.index = Number(indexArg.value);
    }
    
    getReturnItem(): CompItem {
        const argTypes = this.functionType.signature.getArgTypes();
        if (this.index < 0 || this.index >= argTypes.length) {
            throw new CompilerError("Invalid function argument index.");
        }
        return argTypes[this.index];
    }
}

class GetReturnTypeFunctionContext extends FunctionTypeFunctionContext {
    
    getReturnItem(): CompItem {
        return this.functionType.signature.getReturnType();
    }
}

abstract class TwoTypesFunctionContext extends TypeFunctionContext {
    type2: ItemType;
    
    initialize(args: CompItem[]): void {
        super.initialize(args);
        const typeArg = args[1];
        if (!(typeArg instanceof ItemType)) {
            throw new CompilerError("Second argument must conform to typeT(itemT).");
        }
        this.type2 = typeArg;
    }
}

class TypeConformsFunctionContext extends TwoTypesFunctionContext {
    
    getReturnItem(): CompItem {
        const typeConforms = this.type.conformsToType(this.type2);
        return new CompInteger(BigInt(typeConforms), booleanType);
    }
}

class TypeIntersectsFunctionContext extends TwoTypesFunctionContext {
    
    getReturnItem(): CompItem {
        const intersectionType = this.type.intersectType(this.type2);
        const typeIntersects = (intersectionType !== null);
        if (typeIntersects) {
            // TEST CODE.
            console.log(intersectionType.getDisplayString());
        }
        return new CompInteger(BigInt(typeIntersects), booleanType);
    }
}

export const createBuiltInFunctions = (
    targetLanguage: TargetLanguage,
): BuiltInFunctionHandle[] => {
    
    const output: BuiltInFunctionHandle[] = [];
    const addBuiltInFunction = (
        name: string,
        argTypes: ItemType[],
        returnType: ItemType,
        contextConstructor: FunctionContextConstructor,
    ): void => {
        output.push(new BuiltInFunctionHandle(
            name,
            targetLanguage,
            contextConstructor,
            argTypes,
            returnType,
        ));
    };
    
    addBuiltInFunction(
        "ptrT",
        [new TypeType(new ItemType())],
        new TypeType(targetLanguage.createPointerType(new ItemType())),
        PtrTFunctionContext,
    );
    addBuiltInFunction(
        "softArrayT",
        [new TypeType(new ItemType())],
        new TypeType(new ArrayType(new ItemType())),
        SoftArrayTFunctionContext,
    );
    addBuiltInFunction(
        "arrayT",
        [new TypeType(new ItemType()), new IntegerType()],
        new TypeType(new ArrayType(new ItemType())),
        ArrayTFunctionContext,
    );
    addBuiltInFunction(
        "fieldNameT",
        [new TypeType(new OrType(structType, unionType))],
        new TypeType(new ArrayType(characterType)),
        FieldNameTFunctionContext,
    );
    addBuiltInFunction(
        "typeT",
        [new ItemType()],
        new TypeType(new ItemType()),
        TypeTFunctionContext,
    );
    addBuiltInFunction(
        "getSize",
        [new TypeType(new ItemType())],
        new IntegerType(),
        GetSizeFunctionContext,
    );
    addBuiltInFunction(
        "getLen",
        [new TypeType(new OrType(
            new ArrayType(new ItemType()), targetLanguage.functionType,
        ))],
        new IntegerType(),
        GetLenFunctionContext,
    );
    addBuiltInFunction(
        "getElemType",
        [new TypeType(new OrType(
            targetLanguage.createPointerType(new ValueType()), new ArrayType(new ItemType()),
        ))],
        new TypeType(new ItemType()),
        GetElemTypeFunctionContext,
    );
    addBuiltInFunction(
        "getFieldType",
        [new TypeType(new OrType(structType, unionType)), new ArrayType(characterType)],
        new TypeType(new ItemType()),
        GetFieldTypeFunctionContext,
    );
    addBuiltInFunction(
        "getFieldOffset",
        [new TypeType(structType), new ArrayType(characterType)],
        new IntegerType(),
        GetFieldOffsetFunctionContext,
    );
    addBuiltInFunction(
        "getArgType",
        [new TypeType(targetLanguage.functionType), new IntegerType()],
        new TypeType(new ItemType()),
        GetArgTypeFunctionContext,
    );
    addBuiltInFunction(
        "getReturnType",
        [new TypeType(targetLanguage.functionType)],
        new TypeType(new ItemType()),
        GetReturnTypeFunctionContext,
    );
    addBuiltInFunction(
        "typeConforms",
        [new TypeType(new ItemType()), new TypeType(new ItemType())],
        booleanType,
        TypeConformsFunctionContext,
    );
    // It's a secret to everybody.
    addBuiltInFunction(
        "typeIntersects",
        [new TypeType(new ItemType()), new TypeType(new ItemType())],
        booleanType,
        TypeIntersectsFunctionContext,
    );
    
    return output;
};


