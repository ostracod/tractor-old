
import * as niceUtils from "./niceUtils.js";
import { CompilerError } from "./compilerError.js";
import { StatementConstructor, Statement, PathImportStatement, ConfigImportStatement, ForeignImportStatement, IdentifierFunctionStatement, InitFunctionStatement, SimpleDefinitionStatement, VariableStatement, FieldStatement, FieldsTypeStatement, ExpressionStatement } from "./statement.js";
import { Expression } from "./expression.js";
import { SingleTypeDefinitionConstructor, SingleTypeDefinition, FieldDefinition, DataFieldDefinition, TypeFieldDefinition, FieldsTypeDefinitionConstructor, FieldsTypeDefinition, StructDefinition, UnionDefinition } from "./typeDefinition.js";
import { VariableDefinition, ArgVariableDefinition, FrameVariableDefinition, CompVariableDefinition, FixedVariableDefinition, AutoVariableDefinition } from "./variableDefinition.js";

interface StatementTypeOptions {
    minimumArgAmount?: number;
    maximumArgAmount?: number;
    argAmount?: number;
    isBlockStart?: boolean;
    isBlockEnd?: boolean;
    canRequire?: boolean;
    canInline?: boolean;
    canBeSoft?: boolean;
    hasDeclarationIdentifier?: boolean;
}

const defaultStatementTypeOptions = {
    minimumArgAmount: 0,
    maximumArgAmount: 0,
    isBlockStart: false,
    isBlockEnd: false,
    canRequire: false,
    canInline: false,
    canBeSoft: false,
    hasDeclarationIdentifier: false,
};

export const directiveStatementTypeMap: { [directive: string]: StatementType } = {};

export class StatementType<T extends Statement = Statement> {
    directive: string;
    statementConstructor: StatementConstructor<T>;
    minimumArgAmount: number;
    maximumArgAmount: number;
    isBlockStart: boolean;
    isBlockEnd: boolean;
    canRequire: boolean;
    canInline: boolean;
    canBeSoft: boolean;
    allowedModifiers: string[];
    hasDeclarationIdentifier: boolean;
    
    constructor(
        directive: string,
        statementConstructor: StatementConstructor<T>,
        options: StatementTypeOptions,
    ) {
        this.directive = directive;
        this.statementConstructor = statementConstructor;
        options = niceUtils.getDictionaryWithDefaults(options, defaultStatementTypeOptions);
        const { argAmount } = options;
        if (typeof argAmount !== "undefined") {
            this.minimumArgAmount = argAmount;
            this.maximumArgAmount = argAmount;
        } else {
            this.minimumArgAmount = options.minimumArgAmount;
            this.maximumArgAmount = options.maximumArgAmount;
        }
        [
            "isBlockStart", "isBlockEnd", "hasDeclarationIdentifier",
            "canRequire", "canInline", "canBeSoft",
        ].forEach((name) => {
            this[name] = options[name];
        });
        this.allowedModifiers = [];
        if (this.canRequire) {
            niceUtils.extendList(this.allowedModifiers, ["REQUIRE", "FOREIGN"]);
        }
        if (this.canInline) {
            niceUtils.extendList(this.allowedModifiers, ["INLINE", "MAYBE_INLINE"]);
        }
        if (this.canBeSoft) {
            this.allowedModifiers.push("SOFT");
        }
        if (this.directive !== null) {
            directiveStatementTypeMap[this.directive] = this;
        }
    }
    
    createStatement(modifiers: string[], args: Expression[]): T {
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

export class SimpleDefinitionStatementType<T1 extends SingleTypeDefinition, T2 extends SimpleDefinitionStatement<T1> = SimpleDefinitionStatement<T1>> extends StatementType<T2> {
    definitionConstructor: SingleTypeDefinitionConstructor<T1>;
    
    constructor(
        directive: string,
        statementConstructor: StatementConstructor<T2>,
        definitionConstructor: SingleTypeDefinitionConstructor<T1>,
        options: StatementTypeOptions,
    ) {
        super(directive, statementConstructor, options);
        this.definitionConstructor = definitionConstructor;
    }
}

export class VariableStatementType<T extends VariableDefinition> extends SimpleDefinitionStatementType<T, VariableStatement<T>> {
    
    constructor(
        directive: string,
        definitionConstructor: SingleTypeDefinitionConstructor<T>,
        options: StatementTypeOptions,
    ) {
        super(directive, VariableStatement, definitionConstructor, options);
    }
}

export class FieldStatementType<T extends FieldDefinition> extends SimpleDefinitionStatementType<T, FieldStatement<T>> {
    
    constructor(
        directive: string,
        definitionConstructor: SingleTypeDefinitionConstructor<T>,
        options: StatementTypeOptions,
    ) {
        super(directive, FieldStatement, definitionConstructor, options);
    }
}

export class FieldsTypeStatementType<T extends FieldsTypeDefinition> extends StatementType<FieldsTypeStatement<T>> {
    definitionConstructor: FieldsTypeDefinitionConstructor<T>;
    
    constructor(
        directive: string,
        definitionConstructor: FieldsTypeDefinitionConstructor<T>,
        options: StatementTypeOptions,
    ) {
        super(directive, FieldsTypeStatement, options);
        this.definitionConstructor = definitionConstructor;
    }
}

export const expressionStatementType = new StatementType(
    null,
    ExpressionStatement,
    { argAmount: 1 },
);
const variableStatementTypeOptions: StatementTypeOptions = {
    minimumArgAmount: 2,
    maximumArgAmount: 3,
    canRequire: true,
    hasDeclarationIdentifier: true,
};
new VariableStatementType("VAR", FrameVariableDefinition, variableStatementTypeOptions);
new VariableStatementType("COMP", CompVariableDefinition, variableStatementTypeOptions);
new VariableStatementType("FIXED", CompVariableDefinition, variableStatementTypeOptions);
new VariableStatementType("AUTO", AutoVariableDefinition, variableStatementTypeOptions);
new StatementType("LABEL", Statement, { argAmount: 1, hasDeclarationIdentifier: true });
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
new FieldStatementType("FIELD", DataFieldDefinition, {
    argAmount: 2,
    hasDeclarationIdentifier: true,
});
new FieldStatementType("TYPE_FIELD", TypeFieldDefinition, {
    argAmount: 2,
    hasDeclarationIdentifier: true,
});
new FieldsTypeStatementType("STRUCT", StructDefinition, {
    argAmount: 1,
    isBlockStart: true,
    canRequire: true,
    canBeSoft: true,
    hasDeclarationIdentifier: true,
});
new FieldsTypeStatementType("UNION", UnionDefinition, {
    argAmount: 1,
    isBlockStart: true,
    canRequire: true,
    canBeSoft: true,
    hasDeclarationIdentifier: true,
});
new VariableStatementType("ARG", ArgVariableDefinition, {
    argAmount: 2,
    hasDeclarationIdentifier: true
});
new StatementType("RET_TYPE", Statement, { argAmount: 1 });
new StatementType("RET", Statement, { maximumArgAmount: 1 });
new StatementType("FUNC_TYPE", Statement, {
    argAmount: 1,
    isBlockStart: true,
    canRequire: true,
    canInline: true,
    canBeSoft: true,
    hasDeclarationIdentifier: true,
});
new StatementType("FUNC", IdentifierFunctionStatement, {
    argAmount: 1,
    isBlockStart: true,
    canRequire: true,
    canInline: true,
    canBeSoft: true,
    hasDeclarationIdentifier: true,
});
new StatementType("INIT_FUNC", InitFunctionStatement, { isBlockStart: true });
new StatementType("IMPORT", PathImportStatement, { argAmount: 1 });
new StatementType("CONFIG_IMPORT", ConfigImportStatement, { argAmount: 1 });
new StatementType("FOREIGN_IMPORT", ForeignImportStatement, { argAmount: 1 });


