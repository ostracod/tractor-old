
import * as niceUtils from "./niceUtils.js";
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
        this.nestedStatements = [];
        this.pos = null;
    }
    
    toString(indentationLevel = 0): string {
        const indentation = niceUtils.getIndentation(indentationLevel);
        const textList = this.modifiers.slice();
        if (this.directive !== null) {
            textList.push(this.directive);
        }
        if (this.args.length > 0) {
            const argsText = this.args.map((arg) => arg.toString()).join(", ");
            textList.push(argsText);
        }
        const lines = [indentation + textList.join(" ")];
        this.nestedStatements.forEach((statement) => {
            lines.push(statement.toString(indentationLevel + 1));
        });
        return lines.join("\n");
    }
}


