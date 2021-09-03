
import { Pos } from "./pos.js";
import { Node } from "./node.js";
import { CompItem } from "./compItem.js";

export abstract class Definition extends Node {
    
    constructor(pos: Pos) {
        super();
        this.pos = pos;
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


