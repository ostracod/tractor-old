
import { Displayable } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { NodeSlot } from "./node.js";
import { TargetLanguage } from "./targetLanguage.js";
import { ArgVariableDefinition } from "./variableDefinition.js";
import { TypeResolver } from "./typeResolver.js";
import { CompItem } from "./compItem.js";
import { ItemType, TypeType, IntegerType, ArrayType } from "./itemType.js";
import { BuiltInFunctionContextConstructor, BuiltInFunctionContext, PtrTFunctionContext, SoftArrayTFunctionContext, ArrayTFunctionContext, TypeTFunctionContext, GetSizeFunctionContext, GetLenFunctionContext, GetElemTypeFunctionContext } from "./builtInFunctionContext.js";

export abstract class FunctionSignature {
    targetLanguage: TargetLanguage;
    
    constructor(targetLanguage: TargetLanguage) {
        this.targetLanguage = targetLanguage;
    }
    
    abstract getArgTypes(): ItemType[];
    
    abstract getReturnType(): ItemType;
    
    abstract getReturnTypeByArgs(args: CompItem[]): ItemType;
}

export class DefinitionFunctionSignature extends FunctionSignature implements Displayable {
    // argVariableDefinitions and returnTypeResolver are weak references.
    argVariableDefinitions: NodeSlot<ArgVariableDefinition>[];
    returnTypeResolver: NodeSlot<TypeResolver>;
    
    constructor(
        targetLanguage: TargetLanguage,
        argVariableDefinitions: NodeSlot<ArgVariableDefinition>[],
        returnTypeResolver: NodeSlot<TypeResolver>,
    ) {
        super(targetLanguage);
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
        targetLanguage: TargetLanguage,
        name: string,
        argTypes: ItemType[],
        returnType: ItemType,
        contextConstructor: BuiltInFunctionContextConstructor,
    ) {
        super(targetLanguage);
        this.name = name;
        this.argTypes = argTypes;
        this.returnType = returnType;
        this.contextConstructor = contextConstructor;
    }
    
    getArgTypes(): ItemType[] {
        return this.argTypes;
    }
    
    getReturnType(): ItemType {
        return this.returnType;
    }
    
    createContext(args: CompItem[]): BuiltInFunctionContext {
        return new this.contextConstructor(this.targetLanguage, args);
    }
    
    getReturnTypeByArgs(args: CompItem[]): ItemType {
        const context = this.createContext(args);
        return context.getReturnType();
    }
}

export const createBuiltInSignatures = (
    targetLanguage: TargetLanguage,
): BuiltInFunctionSignature[] => {
    
    const output: BuiltInFunctionSignature[] = [];
    const addBuiltInSignature = (
        name: string,
        argTypes: ItemType[],
        returnType: ItemType,
        contextConstructor: BuiltInFunctionContextConstructor,
    ): void => {
        output.push(new BuiltInFunctionSignature(
            targetLanguage,
            name,
            argTypes,
            returnType,
            contextConstructor,
        ));
    };
    
    addBuiltInSignature(
        "ptrT",
        [new TypeType(new ItemType())],
        new TypeType(targetLanguage.createPointerType(new ItemType())),
        PtrTFunctionContext,
    );
    addBuiltInSignature(
        "softArrayT",
        [new TypeType(new ItemType())],
        new TypeType(new ArrayType(new ItemType())),
        SoftArrayTFunctionContext,
    );
    addBuiltInSignature(
        "arrayT",
        [new TypeType(new ItemType()), new IntegerType()],
        new TypeType(new ArrayType(new ItemType())),
        ArrayTFunctionContext,
    );
    addBuiltInSignature(
        "typeT",
        [new ItemType()],
        new TypeType(new ItemType()),
        TypeTFunctionContext,
    );
    
    addBuiltInSignature(
        "getSize",
        [new TypeType(new ItemType())],
        new IntegerType(),
        GetSizeFunctionContext,
    );
    addBuiltInSignature(
        "getLen",
        // TODO: Express this as a union of arrayT and funcT.
        [new TypeType(new ItemType())],
        new IntegerType(),
        GetLenFunctionContext,
    );
    addBuiltInSignature(
        "getElemType",
        // TODO: Express this as a union of ptrT and arrayT.
        [new TypeType(new ItemType())],
        new TypeType(new ItemType()),
        GetElemTypeFunctionContext,
    );
    
    return output;
};


