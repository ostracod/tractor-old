
import { Node } from "./node.js";

export abstract class Definition extends Node {
    
    abstract getDisplayLines(): string[];
    
    getDisplayString(): string {
        return this.getDisplayLines().join("\n");
    }
}


