
import { IdentifierDefinition } from "./interfaces.js";
import { Definition } from "./definition.js";
import { Identifier, NameIdentifier } from "./identifier.js";
import { IdentifierDefinitionMap } from "./identifierDefinitionMap.js";
import { CompItem, CompNumber } from "./compItem.js";

export class BuiltInDefinition extends Definition implements IdentifierDefinition {
    identifier: Identifier;
    item: CompItem;
    
    constructor(identifier: Identifier, item: CompItem) {
        super();
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

const addBuiltInDefinition = (name: string, item: CompItem): void => {
    const identifier = new NameIdentifier(name);
    const definition = new BuiltInDefinition(identifier, item);
    builtInDefinitions.push(definition);
};

addBuiltInDefinition("TRUE", new CompNumber(1n));
addBuiltInDefinition("FALSE", new CompNumber(0n));

export const createBuiltInDefinitionMap = (): IdentifierDefinitionMap<BuiltInDefinition> => {
    const output = new IdentifierDefinitionMap<BuiltInDefinition>();
    builtInDefinitions.forEach((definition) => {
        output.add(definition.copy());
    });
    return output;
};


