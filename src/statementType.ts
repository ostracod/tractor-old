
import * as niceUtils from "./niceUtils.js";
import CompilerError from "./compilerError.js";
import { Expression } from "./expression.js";
import Compiler from "./compiler.js";

interface StatementTypeOptions {
    minimumArgAmount?: number;
    maximumArgAmount?: number;
    argAmount?: number;
    isBlockStart?: boolean;
    isBlockEnd?: boolean;
}

export const directiveStatementTypeMap: { [directive: string]: StatementType } = {};

export class StatementType {
    directive: string;
    minimumArgAmount: number;
    maximumArgAmount: number;
    isBlockStart: boolean;
    isBlockEnd: boolean;
    
    constructor(directive: string, options: StatementTypeOptions = {}) {
        this.directive = directive;
        const { argAmount } = options;
        if (typeof argAmount !== "undefined") {
            this.minimumArgAmount = argAmount;
            this.maximumArgAmount = argAmount;
        } else {
            this.minimumArgAmount = niceUtils.getWithDefault(options, "minimumArgAmount", 0);
            this.maximumArgAmount = niceUtils.getWithDefault(options, "maximumArgAmount", 0);
        }
        this.isBlockStart = niceUtils.getWithDefault(options, "isBlockStart", false);
        this.isBlockEnd = niceUtils.getWithDefault(options, "isBlockEnd", false);
        if (this.directive !== null) {
            directiveStatementTypeMap[this.directive] = this;
        }
    }
    
    validateArgCount(argCount: number): void {
        if (argCount < this.minimumArgAmount || argCount > this.maximumArgAmount) {
            if (this.minimumArgAmount === this.maximumArgAmount) {
                throw new CompilerError(`Expected ${niceUtils.getNumberPhrase(this.minimumArgAmount, "argument")}.`);
            } else {
                throw new CompilerError(`Expected between ${this.minimumArgAmount} and ${this.maximumArgAmount} arguments.`);
            }
        }
    }
}

export abstract class ImportStatementType extends StatementType {
    
    abstract importFiles(args: Expression[], compiler: Compiler): void;
}

class PathImportStatementType extends ImportStatementType {
    
    constructor() {
        super("IMPORT", { argAmount: 1 });
    }
    
    importFiles(args: Expression[], compiler: Compiler): void {
        const path = args[0].evaluateToString();
        compiler.importTractorFile(path);
    }
}

class ConfigImportStatementType extends ImportStatementType {
    
    constructor() {
        super("CONFIG_IMPORT", { argAmount: 1 });
    }
    
    importFiles(args: Expression[], compiler: Compiler): void {
        const name = args[0].evaluateToString();
        const path = compiler.configImportMap[name];
        compiler.importTractorFile(path);
    }
}

class ForeignImportStatementType extends ImportStatementType {
    
    constructor() {
        super("FOREIGN_IMPORT", { argAmount: 1 });
    }
    
    importFiles(args: Expression[], compiler: Compiler): void {
        const path = args[0].evaluateToString();
        compiler.importForeignFile(path);
    }
}

export const expressionStatementType = new StatementType(null, { argAmount: 1 });
new StatementType("VAR", { minimumArgAmount: 2, maximumArgAmount: 3 });
new StatementType("COMP", { argAmount: 3 });
new StatementType("FIXED", { argAmount: 3 });
new StatementType("LABEL", { argAmount: 1 });
new StatementType("JUMP", { argAmount: 1 });
new StatementType("JUMP_IF", { argAmount: 2 });
new StatementType("SCOPE", { isBlockStart: true });
new StatementType("END", { isBlockEnd: true });
new StatementType("IF", { argAmount: 1, isBlockStart: true });
new StatementType("ELSE_IF", { argAmount: 1, isBlockStart: true, isBlockEnd: true })
new StatementType("ELSE", { isBlockStart: true, isBlockEnd: true });
new StatementType("WHILE", { argAmount: 1, isBlockStart: true });
new StatementType("BREAK");
new StatementType("CONTINUE");
new StatementType("FIELD", { argAmount: 2 });
new StatementType("TYPE_FIELD", { argAmount: 2 });
new StatementType("STRUCT", { argAmount: 1, isBlockStart: true });
new StatementType("UNION", { argAmount: 1, isBlockStart: true });
new StatementType("ARG", { argAmount: 2 });
new StatementType("RET_TYPE", { argAmount: 1 });
new StatementType("RET", { maximumArgAmount: 1 });
new StatementType("FUNC_TYPE", { argAmount: 1, isBlockStart: true });
new StatementType("FUNC", { argAmount: 1, isBlockStart: true });
new StatementType("INIT_FUNC", { isBlockStart: true });
new PathImportStatementType();
new ConfigImportStatementType();
new ForeignImportStatementType();


