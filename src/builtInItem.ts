
import { Identifier, NameIdentifier, IdentifierMap } from "./identifier.js";
import { CompItem } from "./compItem.js";
import { CompInteger, BuiltInFunctionHandle } from "./compValue.js";
import { ItemType, ValueType, VoidType, IntegerType, structType, unionType } from "./itemType.js";
import { createBuiltInSignatures } from "./functionSignature.js";
import { TargetLanguage } from "./targetLanguage.js";

interface BuiltInItem {
    identifier: Identifier;
    item: CompItem;
}

export const createBuiltInItemMap = (
    targetLanguage: TargetLanguage,
): IdentifierMap<CompItem> => {
    
    const builtInItems: BuiltInItem[] = [];
    const addBuiltInItem = (item: CompItem, name: string = null): void => {
        if (name === null) {
            name = item.getDisplayString();
        }
        const identifier = new NameIdentifier(name);
        builtInItems.push({ identifier, item });
    };
    
    addBuiltInItem(new CompInteger(1n), "TRUE");
    addBuiltInItem(new CompInteger(0n), "FALSE");
    
    addBuiltInItem(new ItemType());
    addBuiltInItem(new ValueType());
    addBuiltInItem(new VoidType());
    [null, 8, 16, 32, 64].forEach((bitAmount) => {
        [null, false, true].forEach((isSigned) => {
            addBuiltInItem(new IntegerType(isSigned, bitAmount));
        });
    });
    addBuiltInItem(structType);
    addBuiltInItem(unionType);
    addBuiltInItem(targetLanguage.functionType);
    
    const signatures = createBuiltInSignatures(targetLanguage);
    signatures.forEach((signature) => {
        addBuiltInItem(new BuiltInFunctionHandle(signature));
    });
    
    const output = new IdentifierMap<CompItem>();
    builtInItems.forEach((builtInItem) => {
        output.add(builtInItem.identifier, builtInItem.item);
    });
    return output;
};


