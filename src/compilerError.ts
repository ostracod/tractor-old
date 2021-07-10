
import Pos from "./pos.js";

export default class CompilerError extends Error {
    message: string;
    pos: Pos;
    
    constructor(message: string, pos: Pos = null) {
        super();
        this.message = message;
        this.pos = pos;
    }
    
    toString(): string {
        let header = "ERROR";
        if (this.pos !== null) {
            header += " " + this.pos.getPrepositionPhrase();
        }
        return `${header}:\n${this.message}`;
    }
}


