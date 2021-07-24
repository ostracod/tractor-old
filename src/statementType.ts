
import * as niceUtils from "./niceUtils.js";
import { CompilerError } from "./compilerError.js";
import { Statement, PathImportStatement, ConfigImportStatement, ForeignImportStatement, NamedFunctionStatement, InitFunctionStatement } from "./statement.js";
import { Expression } from "./expression.js";

type StatementConstructor = new (
    type: StatementType,
    modifiers: string[],
    args: Expression[],
) => Statement;

interface StatementTypeOptions {
    minimumArgAmount?: number;
    maximumArgAmount?: number;
    argAmount?: number;
    isBlockStart?: boolean;
    isBlockEnd?: boolean;
    canRequire?: boolean;
    canInline?: boolean;
}

export const directiveStatementTypeMap: { [directive: string]: StatementType } = {};

export class StatementType {
    directive: string;
    statementConstructor: StatementConstructor;
    minimumArgAmount: number;
    maximumArgAmount: number;
    isBlockStart: boolean;
    isBlockEnd: boolean;
    canRequire: boolean;
    canInline: boolean;
    allowedModifiers: string[];
    
    constructor(
        directive: string,
        statementConstructor: StatementConstructor,
        options: StatementTypeOptions,
    ) {
        this.directive = directive;
        this.statementConstructor = statementConstructor;
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
        this.canRequire = niceUtils.getWithDefault(options, "canRequire", false);
        this.canInline = niceUtils.getWithDefault(options, "canInline", false);
        this.allowedModifiers = [];
        if (this.canRequire) {
            niceUtils.extendList(this.allowedModifiers, ["REQUIRE", "FOREIGN"]);
        }
        if (this.canInline) {
            niceUtils.extendList(this.allowedModifiers, ["INLINE", "MAYBE_INLINE"]);
        }
        if (this.directive !== null) {
            directiveStatementTypeMap[this.directive] = this;
        }
    }
    
    createStatement(modifiers: string[], args: Expression[]): Statement {
        return new this.statementConstructor(this, modifiers, args);
    }
    
    validateModifiers(modifiers: string[]): void {
        modifiers.forEach((modifier) => {
            if (!this.allowedModifiers.includes(modifier)) {
                throw new CompilerError(`Unexpected ${modifier} modifier.`);
            }
        });
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

export const expressionStatementType = new StatementType(null, Statement, { argAmount: 1 });
new StatementType("VAR", Statement, {
    minimumArgAmount: 2,
    maximumArgAmount: 3,
    canRequire: true,
});
new StatementType("COMP", Statement, { argAmount: 3, canRequire: true });
new StatementType("FIXED", Statement, { argAmount: 3, canRequire: true });
new StatementType("LABEL", Statement, { argAmount: 1 });
new StatementType("JUMP", Statement, { argAmount: 1 });
new StatementType("JUMP_IF", Statement, { argAmount: 2 });
new StatementType("SCOPE", Statement, { isBlockStart: true });
new StatementType("END", Statement, { isBlockEnd: true });
new StatementType("IF", Statement, { argAmount: 1, isBlockStart: true });
new StatementType("ELSE_IF", Statement, {
    argAmount: 1,
    isBlockStart: true,
    isBlockEnd: true,
});
new StatementType("ELSE", Statement, { isBlockStart: true, isBlockEnd: true });
new StatementType("WHILE", Statement, { argAmount: 1, isBlockStart: true });
new StatementType("BREAK", Statement, {});
new StatementType("CONTINUE", Statement, {});
new StatementType("FIELD", Statement, { argAmount: 2 });
new StatementType("TYPE_FIELD", Statement, { argAmount: 2 });
new StatementType("STRUCT", Statement, {
    argAmount: 1,
    isBlockStart: true,
    canRequire: true,
});
new StatementType("UNION", Statement, { argAmount: 1, isBlockStart: true, canRequire: true });
new StatementType("ARG", Statement, { argAmount: 2 });
new StatementType("RET_TYPE", Statement, { argAmount: 1 });
new StatementType("RET", Statement, { maximumArgAmount: 1 });
new StatementType("FUNC_TYPE", Statement, {
    argAmount: 1,
    isBlockStart: true,
    canRequire: true,
    canInline: true,
});
new StatementType("FUNC", NamedFunctionStatement, {
    argAmount: 1,
    isBlockStart: true,
    canRequire: true,
    canInline: true,
});
new StatementType("INIT_FUNC", InitFunctionStatement, { isBlockStart: true });
new StatementType("IMPORT", PathImportStatement, { argAmount: 1 });
new StatementType("CONFIG_IMPORT", ConfigImportStatement, { argAmount: 1 });
new StatementType("FOREIGN_IMPORT", ForeignImportStatement, { argAmount: 1 });


