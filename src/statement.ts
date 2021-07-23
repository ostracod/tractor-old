
import * as niceUtils from "./niceUtils.js";
import Pos from "./pos.js";
import { StatementType } from "./statementType.js";
import { Expression } from "./expression.js";

export default class Statement<T extends StatementType = StatementType> {
    modifiers: string[];
    type: T;
    args: Expression[];
    nestedStatements: Statement[];
    pos: Pos;
    
    constructor(modifiers: string[], type: T, args: Expression[]) {
        this.modifiers = modifiers;
        this.type = type;
        this.args = args;
        this.nestedStatements = [];
        this.pos = null;
        this.type.validateArgCount(this.args.length);
    }
    
    toString(indentationLevel = 0): string {
        const indentation = niceUtils.getIndentation(indentationLevel);
        const textList = this.modifiers.slice();
        const { directive } = this.type;
        if (directive !== null) {
            textList.push(directive);
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


