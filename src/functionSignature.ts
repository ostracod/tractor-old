
import { Displayable } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { NodeSlot } from "./node.js";
import { ArgVariableDefinition } from "./variableDefinition.js";
import { TypeResolver } from "./typeResolver.js";
import { CompItem } from "./compItem.js";
import { ItemType, TypeType, IntegerType, PointerType, ArrayType } from "./itemType.js";
import { BuiltInFunctionContextConstructor, BuiltInFunctionContext, PtrTFunctionContext, SoftArrayTFunctionContext, ArrayTFunctionContext, TypeTFunctionContext, GetLenFunctionContext, GetElemTypeFunctionContext } from "./builtInFunctionContext.js";

export const builtInFunctionSignatures: BuiltInFunctionSignature[] = [];

export abstract class FunctionSignature {
    
    abstract getArgTypes(): ItemType[];
    
    abstract getReturnType(): ItemType;
    
    abstract getReturnTypeByArgs(args: CompItem[]): ItemType;
}

export class DefinitionFunctionSignature extends FunctionSignature implements Displayable {
    // argVariableDefinitions and returnTypeResolver are weak references.
    argVariableDefinitions: NodeSlot<ArgVariableDefinition>[];
    returnTypeResolver: NodeSlot<TypeResolver>;
    
    constructor(
        argVariableDefinitions: NodeSlot<ArgVariableDefinition>[],
        returnTypeResolver: NodeSlot<TypeResolver>,
    ) {
        super();
        this.argVariableDefinitions = argVariableDefinitions;
        this.returnTypeResolver = returnTypeResolver;
    }
    
    getReturnTypeDisplayLines(): string[] {
        const returnTypeResolver = this.returnTypeResolver.get();
        if (returnTypeResolver === null) {
            return [];
        }
        const returnTypeText = returnTypeResolver.getDisplayString();
        return ["Return type: " + returnTypeText];
    }
    
    getDisplayLines(): string[] {
        const output = [];
        this.argVariableDefinitions.forEach((slot) => {
            niceUtils.extendList(output, slot.get().getDisplayLines());
        });
        niceUtils.extendList(output, this.getReturnTypeDisplayLines());
        return output;
    }
    
    getDisplayString(): string {
        return this.getDisplayLines().join("\n");
    }
    
    // TODO: Implement all of these methods.
    
    getArgTypes(): ItemType[] {
        return null;
    }
    
    getReturnType(): ItemType {
        return null;
    }
    
    getReturnTypeByArgs(args: CompItem[]): ItemType {
        return null;
    }
}

export class BuiltInFunctionSignature extends FunctionSignature {
    name: string;
    argTypes: ItemType[];
    returnType: ItemType;
    contextConstructor: BuiltInFunctionContextConstructor;
    
    constructor(
        name: string,
        argTypes: ItemType[],
        returnType: ItemType,
        contextConstructor: BuiltInFunctionContextConstructor,
    ) {
        super();
        this.name = name;
        this.argTypes = argTypes;
        this.returnType = returnType;
        this.contextConstructor = contextConstructor;
        builtInFunctionSignatures.push(this);
    }
    
    getArgTypes(): ItemType[] {
        return this.argTypes;
    }
    
    getReturnType(): ItemType {
        return this.returnType;
    }
    
    createContext(args: CompItem[]): BuiltInFunctionContext {
        return new this.contextConstructor(args);
    }
    
    getReturnTypeByArgs(args: CompItem[]): ItemType {
        const context = this.createContext(args);
        return context.getReturnType();
    }
}

new BuiltInFunctionSignature(
    "ptrT",
    [new TypeType(new ItemType())],
    new TypeType(new PointerType(new ItemType())),
    PtrTFunctionContext,
);
new BuiltInFunctionSignature(
    "softArrayT",
    [new TypeType(new ItemType())],
    new TypeType(new ArrayType(new ItemType())),
    SoftArrayTFunctionContext,
);
new BuiltInFunctionSignature(
    "arrayT",
    [new TypeType(new ItemType()), new IntegerType()],
    new TypeType(new ArrayType(new ItemType())),
    ArrayTFunctionContext,
);
new BuiltInFunctionSignature(
    "typeT",
    [new ItemType()],
    new TypeType(new ItemType()),
    TypeTFunctionContext,
);
new BuiltInFunctionSignature(
    "getLen",
    // TODO: Express this as a union of arrayT and funcT.
    [new TypeType(new ItemType())],
    new IntegerType(),
    GetLenFunctionContext,
);
new BuiltInFunctionSignature(
    "getElemType",
    // TODO: Express this as a union of ptrT and arrayT.
    [new TypeType(new ItemType())],
    new TypeType(new ItemType()),
    GetElemTypeFunctionContext,
);


