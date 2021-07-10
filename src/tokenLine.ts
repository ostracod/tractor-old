
import { Token } from "./token.js";
import Pos from "./pos.js";

export default class TokenLine {
    tokens: Token[];
    pos: Pos;
    
    constructor(tokens: Token[], pos: Pos) {
        this.tokens = tokens;
        this.pos = pos;
    }
}


