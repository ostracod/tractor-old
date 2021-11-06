
import { IdentifierDefinition } from "./interfaces.js";
import { Node, NodeSlot } from "./node.js";
import { Identifier, DisplayableIdentifierMap } from "./identifier.js";

export class IdentifierDefinitionMap<T extends IdentifierDefinition = IdentifierDefinition> extends Node {
    identifierMap: DisplayableIdentifierMap<NodeSlot<T>>;
    
    constructor(definitions: T[] = []) {
        super();
        this.identifierMap = new DisplayableIdentifierMap();
        definitions.forEach((definition) => {
            this.add(definition);
        });
    }
    
    get(identifier: Identifier): T {
        const slot = this.identifierMap.get(identifier);
        if (slot === null) {
            return null
        } else {
            return slot.get();
        }
    }
    
    add<T2 extends T>(definition: T2): NodeSlot<T2> {
        const slot = this.addSlot(definition);
        const { identifier } = definition.identifierBehavior;
        this.identifierMap.add(identifier, slot);
        return slot;
    }
    
    iterate(handle: (definition: T) => void): void {
        this.identifierMap.iterate((identifier, slot) => handle(slot.get()));
    }
    
    getDisplayString(): string {
        const lines: string[] = [];
        this.iterate((definition) => {
            lines.push(`${definition.identifierBehavior.getDisplayString()}: ${definition.getDisplayString()}`);
        });
        return lines.join("\n");
    }
}


