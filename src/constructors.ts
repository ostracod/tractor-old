
import { Compiler } from "./compiler.js";
import { Statement } from "./statement/statement.js";
import { StatementBlock } from "./statement/statementBlock.js";
import { StatementGenerator } from "./statement/statementGenerator.js";
import { Expression } from "./statement/expression.js";
import { TypeType } from "./compItem/basicType.js";

// This is just a massive hack to avoid circular dependencies.

interface Constructors {
    Compiler: typeof Compiler;
    Statement: typeof Statement;
    StatementBlock: typeof StatementBlock;
    StatementGenerator: typeof StatementGenerator;
    Expression: typeof Expression;
    TypeType: typeof TypeType;
}

export const constructors = {} as Constructors;


