
import * as niceUtils from "./niceUtils.js";
import Pos from "./pos.js";
import { StatementType } from "./statementType.js";
import { Expression } from "./expression.js";

export default class Statement {
    modifiers: string[];
    statementType: StatementType;
    args: Expression[];
    nestedStatements: Statement[];
    pos: Pos;
    
    constructor(modifiers: string[], statementType: StatementType, args: Expression[]) {
        this.modifiers = modifiers;
        this.statementType = statementType;
        this.args = args;
        this.nestedStatements = [];
        this.pos = null;
        this.statementType.validateArgCount(this.args.length);
    }
    
    getDirective(): string {
        return this.statementType.directive;
    }
    
    toString(indentationLevel = 0): string {
        const indentation = niceUtils.getIndentation(indentationLevel);
        const textList = this.modifiers.slice();
        const directive = this.getDirective();
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


