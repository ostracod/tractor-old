
import { Displayable } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { NodeSlot } from "./node.js";
import { ArgVariableDefinition } from "./variableDefinition.js";
import { TypeResolver } from "./typeResolver.js";
import { CompItem } from "./compItem.js";
import { ItemType, TypeType, IntegerType, ArrayType } from "./itemType.js";
import { BuiltInFunctionContextConstructor, BuiltInFunctionContext, ArrayTFunctionContext } from "./builtInFunctionContext.js";

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

export abstract class BuiltInFunctionSignature extends FunctionSignature {
    
    abstract getContextConstructor(): BuiltInFunctionContextConstructor;
    
    createContext(args: CompItem[]): BuiltInFunctionContext {
        const contextConstructor = this.getContextConstructor();
        return new contextConstructor(args);
    }
    
    getReturnTypeByArgs(args: CompItem[]): ItemType {
        const context = this.createContext(args);
        return context.getReturnType();
    }
}

class ArrayTFunctionSignature extends BuiltInFunctionSignature {
    
    getArgTypes(): ItemType[] {
        return [new TypeType(new ItemType()), new IntegerType()];
    }
    
    getReturnType(): ItemType {
        return new TypeType(new ArrayType(new ItemType()));
    }
    
    getContextConstructor(): BuiltInFunctionContextConstructor {
        return ArrayTFunctionContext;
    }
}

export const arrayTFunctionSignature = new ArrayTFunctionSignature();


