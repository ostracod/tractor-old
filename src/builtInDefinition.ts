
import { IdentifierDefinition } from "./interfaces.js";
import { Definition } from "./definition.js";
import { Identifier, NameIdentifier } from "./identifier.js";
import { IdentifierBehavior } from "./identifierBehavior.js";
import { IdentifierDefinitionMap } from "./identifierDefinitionMap.js";
import { CompItem } from "./compItem.js";
import { CompInteger } from "./compValue.js";
import { ItemType, ValueType, IntegerType } from "./itemType.js";

export class BuiltInDefinition extends Definition implements IdentifierDefinition {
    identifierBehavior: IdentifierBehavior;
    item: CompItem;
    
    constructor(identifierBehavior: IdentifierBehavior, item: CompItem) {
        super(null);
        this.identifierBehavior = identifierBehavior;
        this.item = item;
    }
    
    copy(): BuiltInDefinition {
        return new BuiltInDefinition(this.identifierBehavior, this.item);
    }
    
    getCompItemOrNull(): CompItem {
        return this.item;
    }
    
    getDisplayLines(): string[] {
        return [`Built-in identifier: ${this.identifierBehavior.getDisplayString()}; item: ${this.item.getDisplayString()}`];
    }
}

const builtInDefinitions: BuiltInDefinition[] = [];

const addBuiltInDefinition = (item: CompItem, name: string = null): void => {
    if (name === null) {
        name = item.getDisplayString();
    }
    const identifier = new NameIdentifier(name);
    const identifierBehavior = new IdentifierBehavior(identifier);
    const definition = new BuiltInDefinition(identifierBehavior, item);
    builtInDefinitions.push(definition);
};

export const initializeBuiltInDefinitions = (): void => {
    
    addBuiltInDefinition(new CompInteger(1n), "TRUE");
    addBuiltInDefinition(new CompInteger(0n), "FALSE");
    
    addBuiltInDefinition(new ItemType());
    addBuiltInDefinition(new ValueType());
    [null, 8, 16, 32, 64].forEach((bitAmount) => {
        [null, false, true].forEach((isSigned) => {
            addBuiltInDefinition(new IntegerType(isSigned, bitAmount));
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


