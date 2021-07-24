
import { Pos } from "./pos.js";

export class CompilerError extends Error {
    message: string;
    pos: Pos;
    
    constructor(message: string, pos: Pos = null) {
        super();
        this.message = message;
        this.pos = pos;
    }
    
    setPosIfMissing(pos: Pos) {
        if (this.pos === null) {
            this.pos = pos;
        }
    }
    
    toString(): string {
        let header = "ERROR";
        if (this.pos !== null) {
            header += " " + this.pos.getPrepositionPhrase();
        }
        return `${header}:\n${this.message}`;
    }
}


