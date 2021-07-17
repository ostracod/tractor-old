
import Pos from "./pos.js";
import { Expression } from "./expression.js";

export default class Statement {
    modifiers: string[];
    directive: string;
    args: Expression[];
    nestedStatements: Statement[];
    pos: Pos;
    
    constructor(modifiers: string[], directive: string, args: Expression[]) {
        this.modifiers = modifiers;
        this.directive = directive;
        this.args = args;
        this.nestedStatements = null;
        this.pos = null;
    }
}


