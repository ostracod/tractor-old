
import { Node } from "./node.js";
import { CompItem } from "./compItem.js";

export abstract class Definition extends Node {
    
    abstract getDisplayLines(): string[];
    
    getCompItemOrNull(): CompItem {
        return null;
    }
    
    getDisplayString(): string {
        return this.getDisplayLines().join("\n");
    }
}


