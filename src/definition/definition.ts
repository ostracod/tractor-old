
import { Node } from "../node.js";
import { IdentifierBehavior } from "../identifierBehavior.js";
import { Pos } from "../parse/pos.js";
import { CompItem } from "../compItem/compItem.js";

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


