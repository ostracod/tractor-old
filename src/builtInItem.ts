
import { Identifier, NameIdentifier, IdentifierMap } from "./identifier.js";
import { CompItem } from "./compItem.js";
import { CompInteger, ArrayTFunctionHandle } from "./compValue.js";
import { ItemType, ValueType, IntegerType } from "./itemType.js";

interface BuiltInItem {
    identifier: Identifier;
    item: CompItem;
}

const builtInItems: BuiltInItem[] = [];

const addBuiltInItem = (item: CompItem, name: string = null): void => {
    if (name === null) {
        name = item.getDisplayString();
    }
    const identifier = new NameIdentifier(name);
    builtInItems.push({ identifier, item });
};

export const initializeBuiltInItems = (): void => {
    
    addBuiltInItem(new CompInteger(1n), "TRUE");
    addBuiltInItem(new CompInteger(0n), "FALSE");
    
    addBuiltInItem(new ItemType());
    addBuiltInItem(new ValueType());
    [null, 8, 16, 32, 64].forEach((bitAmount) => {
        [null, false, true].forEach((isSigned) => {
            addBuiltInItem(new IntegerType(isSigned, bitAmount));
        });
    });
    addBuiltInItem(new ArrayTFunctionHandle());
};

export const createBuiltInItemMap = (): IdentifierMap<CompItem> => {
    const output = new IdentifierMap<CompItem>();
    builtInItems.forEach((builtInItem) => {
        output.add(builtInItem.identifier, builtInItem.item);
    });
    return output;
};


