
import * as niceUtils from "./niceUtils.js";
import { Pos } from "./pos.js";
import { StatementType } from "./statementType.js";
import { Compiler } from "./compiler.js";
import { Expression } from "./expression.js";

export class Statement {
    type: StatementType;
    modifiers: string[];
    args: Expression[];
    pos: Pos;
    nestedStatements: Statement[];
    
    constructor(type: StatementType, modifiers: string[], args: Expression[]) {
        this.type = type;
        this.modifiers = modifiers;
        this.args = args;
        this.pos = null;
        this.nestedStatements = [];
        this.type.validateArgCount(this.args.length);
    }
    
    getCompiler(): Compiler {
        return this.pos.sourceFile.compiler;
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

export abstract class ImportStatement extends Statement {
    
    abstract importFiles(): void;
}

export class PathImportStatement extends ImportStatement {
    
    importFiles(): void {
        const path = this.args[0].evaluateToString();
        const compiler = this.getCompiler();
        compiler.importTractorFile(path);
    }
}

export class ConfigImportStatement extends ImportStatement {
    
    importFiles(): void {
        const name = this.args[0].evaluateToString();
        const compiler = this.getCompiler();
        const path = compiler.configImportMap[name];
        compiler.importTractorFile(path);
    }
}

export class ForeignImportStatement extends ImportStatement {
    
    importFiles(): void {
        const path = this.args[0].evaluateToString();
        const compiler = this.getCompiler();
        compiler.importForeignFile(path);
    }
}


