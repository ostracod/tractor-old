
import { CompItem } from "./compItem/compItem.js";
import { ItemType } from "./compItem/itemType.js";
import { TargetLanguage } from "./targetLanguage.js";
import { FunctionContextConstructor, BuiltInFunctionContext } from "./functionContext.js";
import { ContextFunctionSignature } from "./functionSignature.js";

export class BuiltInFunction {
    name: string;
    targetLanguage: TargetLanguage;
    contextConstructor: FunctionContextConstructor<BuiltInFunctionContext>;
    signature: ContextFunctionSignature<BuiltInFunctionContext>;
    
    constructor(
        name: string,
        targetLanguage: TargetLanguage,
        contextConstructor: FunctionContextConstructor<BuiltInFunctionContext>,
        argTypes: ItemType[],
        returnType: ItemType,
    ) {
        this.name = name;
        this.targetLanguage = targetLanguage;
        this.contextConstructor = contextConstructor;
        this.signature = new ContextFunctionSignature(
            this.targetLanguage,
            false,
            argTypes,
            returnType,
            this.contextConstructor,
        );
    }
    
    createContext(args: CompItem[]): BuiltInFunctionContext {
        return new this.contextConstructor(this.targetLanguage, args);
    }
}


