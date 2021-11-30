
import { TargetCodeGeneratorConstructor, UnixCGenerator } from "./targetCodeGenerator.js";
import { ItemType, PointerType, FunctionType } from "./itemType.js";
import { GenericFunctionContext } from "./functionContext.js";
import { ContextFunctionSignature } from "./functionSignature.js";

export const targetLanguageMap: { [name: string]: TargetLanguage } = {};

export class TargetLanguage {
    name: string;
    pointerSize: number;
    functionType: FunctionType;
    codeGeneratorConstructor: TargetCodeGeneratorConstructor;
    
    constructor(
        name: string,
        pointerSize: number,
        codeGeneratorConstructor: TargetCodeGeneratorConstructor,
    ) {
        this.name = name;
        this.pointerSize = pointerSize;
        this.functionType = new FunctionType(new ContextFunctionSignature(
            this, true, [], new ItemType(), GenericFunctionContext,
        ));
        this.codeGeneratorConstructor = codeGeneratorConstructor;
        targetLanguageMap[this.name] = this;
    }
    
    createPointerType(type: ItemType): PointerType {
        return new PointerType(type, this.pointerSize);
    }
}

new TargetLanguage("unixC", 8, UnixCGenerator);


