
import { IdentifierDefinition } from "./interfaces.js";
import { Node, NodeSlot } from "./node.js";
import { Identifier, IdentifierMap } from "./identifier.js";

export class Scope extends Node {
    identifierMap: IdentifierMap<NodeSlot<IdentifierDefinition>>;
    
    constructor() {
        super();
        this.identifierMap = new IdentifierMap();
    }
    
    get(identifier: Identifier): IdentifierDefinition {
        const slot = this.identifierMap.get(identifier);
        if (slot === null) {
            return null
        } else {
            return slot.get();
        }
    }
    
    add<T extends IdentifierDefinition>(definition: T): NodeSlot<T> {
        const slot = this.addSlot(definition);
        this.identifierMap.add(definition.identifier, slot);
        return slot;
    }
    
    iterate(handle: (definition: IdentifierDefinition) => void): void {
        this.identifierMap.iterate((identifier, slot) => handle(slot.get()));
    }
    
    getDisplayString(): string {
        const lines: string[] = [];
        this.iterate((definition) => {
            lines.push(`${definition.identifier.getDisplayString()}: ${definition.getDisplayString()}`);
        });
        return lines.join("\n");
    }
}


