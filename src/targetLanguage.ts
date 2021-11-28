
import { TargetCodeGeneratorConstructor, UnixCGenerator } from "./targetCodeGenerator.js";
import { ItemType, PointerType } from "./itemType.js";

export const targetLanguageMap: { [name: string]: TargetLanguage } = {};

export class TargetLanguage {
    name: string;
    pointerSize: number;
    codeGeneratorConstructor: TargetCodeGeneratorConstructor;
    
    constructor(
        name: string,
        pointerSize: number,
        codeGeneratorConstructor: TargetCodeGeneratorConstructor,
    ) {
        this.name = name;
        this.pointerSize = pointerSize;
        this.codeGeneratorConstructor = codeGeneratorConstructor;
        targetLanguageMap[this.name] = this;
    }
    
    createPointerType(type: ItemType): PointerType {
        return new PointerType(type, this.pointerSize);
    }
}

new TargetLanguage("unixC", 8, UnixCGenerator);


