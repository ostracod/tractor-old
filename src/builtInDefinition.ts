
import { IdentifierDefinition } from "./interfaces.js";
import { constructors } from "./constructors.js";
import { Definition } from "./definition.js";
import { Identifier, NameIdentifier } from "./identifier.js";
import { IdentifierDefinitionMap } from "./identifierDefinitionMap.js";
import { CompItem, CompInteger } from "./compItem.js";
import { ValueType } from "./itemType.js";

export class BuiltInDefinition extends Definition implements IdentifierDefinition {
    identifier: Identifier;
    item: CompItem;
    
    constructor(identifier: Identifier, item: CompItem) {
        super(null);
        this.identifier = identifier;
        this.item = item;
    }
    
    copy(): BuiltInDefinition {
        return new BuiltInDefinition(this.identifier, this.item);
    }
    
    getCompItemOrNull(): CompItem {
        return this.item;
    }
    
    getDisplayLines(): string[] {
        return [`Built-in identifier: ${this.identifier.getDisplayString()}; item: ${this.item.getDisplayString()}`];
    }
}

const builtInDefinitions: BuiltInDefinition[] = [];

const addBuiltInDefinition = (item: CompItem, name: string = null): void => {
    if (name === null) {
        name = item.getDisplayString();
    }
    const identifier = new NameIdentifier(name);
    const definition = new BuiltInDefinition(identifier, item);
    builtInDefinitions.push(definition);
};

export const initializeBuiltInDefinitions = (): void => {
    
    addBuiltInDefinition(new CompInteger(1n), "TRUE");
    addBuiltInDefinition(new CompInteger(0n), "FALSE");
    
    addBuiltInDefinition(new constructors.ItemType());
    addBuiltInDefinition(new ValueType());
    [null, 8, 16, 32, 64].forEach((bitAmount) => {
        [null, false, true].forEach((isSigned) => {
            addBuiltInDefinition(new constructors.IntegerType(isSigned, bitAmount));
        });
    });
};

export const createBuiltInDefinitionMap = (): IdentifierDefinitionMap<BuiltInDefinition> => {
    const output = new IdentifierDefinitionMap<BuiltInDefinition>();
    builtInDefinitions.forEach((definition) => {
        output.add(definition.copy());
    });
    return output;
};


