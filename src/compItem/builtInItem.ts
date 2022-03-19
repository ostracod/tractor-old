
import { Identifier, NameIdentifier, IdentifierMap } from "../identifier.js";
import { createBuiltInFunctions } from "../functionContext.js";
import { TargetLanguage } from "../targetLanguage.js";
import { CompItem } from "./compItem.js";
import { CompInteger, CompNull } from "./compValue.js";
import { ItemType } from "./itemType.js";
import { ValueType, VoidType, IntegerType, structType, unionType } from "./basicType.js";
import { storageTypeConstructors, LocationType } from "./storageType.js";

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
    const pointerType = targetLanguage.createPointerType(new LocationType());
    addBuiltInItem(new CompNull(pointerType));
    
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
    addBuiltInItem(targetLanguage.functionType, "funcT");
    
    storageTypeConstructors.forEach((constructor) => {
        addBuiltInItem(new constructor(false));
    });
    
    const builtInFunctionHandles = createBuiltInFunctions(targetLanguage);
    builtInFunctionHandles.forEach((builtInFunctionHandle) => {
        addBuiltInItem(builtInFunctionHandle);
    });
    
    const output = new IdentifierMap<CompItem>();
    builtInItems.forEach((builtInItem) => {
        output.add(builtInItem.identifier, builtInItem.item);
    });
    return output;
};


