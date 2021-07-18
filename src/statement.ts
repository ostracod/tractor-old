
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
    
    toString(): string {
        const textList = this.modifiers.slice();
        if (this.directive !== null) {
            textList.push(this.directive);
        }
        if (this.args.length > 0) {
            const argsText = this.args.map((arg) => arg.toString()).join(", ");
            textList.push(argsText);
        }
        return textList.join(" ");
    }
}


