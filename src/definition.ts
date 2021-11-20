
import { Pos } from "./pos.js";
import { Node } from "./node.js";
import { CompItem } from "./compItem.js";
import { IdentifierBehavior } from "./identifierBehavior.js";

export abstract class Definition extends Node {
    identifierBehavior: IdentifierBehavior;
    
    constructor(pos: Pos, identifierBehavior: IdentifierBehavior) {
        super();
        this.pos = pos;
        this.identifierBehavior = identifierBehavior;
    }
    
    abstract getDisplayLines(): string[];
    
    getCompItemOrNull(): CompItem {
        return null;
    }
    
    getDisplayString(): string {
        return this.getDisplayLines().join("\n");
    }
    
    convertToUnixC(): string {
        return null;
    }
}


