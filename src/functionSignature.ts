
import { Displayable } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { NodeSlot } from "./node.js";
import { TargetLanguage } from "./targetLanguage.js";
import { ArgVariableDefinition } from "./definition/variableDefinition.js";
import { TypeResolver } from "./typeResolver.js";
import { CompItem } from "./compItem/compItem.js";
import { ItemType } from "./compItem/itemType.js";
import { FunctionContextConstructor, FunctionContext } from "./functionContext.js";

export abstract class FunctionSignature {
    targetLanguage: TargetLanguage;
    isSoft: boolean;
    
    constructor(targetLanguage: TargetLanguage, isSoft: boolean) {
        this.targetLanguage = targetLanguage;
        this.isSoft = isSoft;
    }
    
    abstract getArgTypes(): ItemType[];
    
    abstract getReturnType(): ItemType;
    
    abstract getReturnTypeByArgs(args: CompItem[]): ItemType;
    
    checkTypes(
        signature: FunctionSignature,
        checkTypes: (type1: ItemType, type2: ItemType) => boolean,
    ): boolean {
        const argTypes1 = this.getArgTypes();
        const argTypes2 = signature.getArgTypes();
        const endIndex = Math.min(argTypes1.length, argTypes2.length);
        for (let index = 0; index < endIndex; index++) {
            const argType1 = argTypes1[index];
            const argType2 = argTypes2[index];
            if (!checkTypes(argType1, argType2)) {
                return false;
            }
        }
        const returnType1 = this.getReturnType();
        const returnType2 = signature.getReturnType();
        return checkTypes(returnType1, returnType2);
    }
}

export class DefinitionFunctionSignature extends FunctionSignature implements Displayable {
    // argVariableDefinitions and returnTypeResolver are weak references.
    argVariableDefinitions: NodeSlot<ArgVariableDefinition>[];
    returnTypeResolver: NodeSlot<TypeResolver>;
    
    constructor(
        targetLanguage: TargetLanguage,
        isSoft: boolean,
        argVariableDefinitions: NodeSlot<ArgVariableDefinition>[],
        returnTypeResolver: NodeSlot<TypeResolver>,
    ) {
        super(targetLanguage, isSoft);
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

export class SimpleFunctionSignature extends FunctionSignature {
    argTypes: ItemType[];
    returnType: ItemType;
    
    constructor(
        targetLanguage: TargetLanguage,
        isSoft: boolean,
        argTypes: ItemType[],
        returnType: ItemType,
    ) {
        super(targetLanguage, isSoft);
        this.argTypes = argTypes;
        this.returnType = returnType;
    }
    
    getArgTypes(): ItemType[] {
        return this.argTypes;
    }
    
    getReturnType(): ItemType {
        return this.returnType;
    }
    
    getReturnTypeByArgs(args: CompItem[]): ItemType {
        return this.returnType;
    }
}

export class ContextFunctionSignature<T extends FunctionContext = FunctionContext> extends SimpleFunctionSignature {
    contextConstructor: FunctionContextConstructor<T>;
    
    constructor(
        targetLanguage: TargetLanguage,
        isSoft: boolean,
        argTypes: ItemType[],
        returnType: ItemType,
        contextConstructor: FunctionContextConstructor<T>,
    ) {
        super(targetLanguage, isSoft, argTypes, returnType);
        this.contextConstructor = contextConstructor;
    }
    
    createContext(args: CompItem[]): T {
        return new this.contextConstructor(this.targetLanguage, args);
    }
    
    getReturnTypeByArgs(args: CompItem[]): ItemType {
        const context = this.createContext(args);
        return context.getReturnType();
    }
}


