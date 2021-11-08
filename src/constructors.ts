
import { Compiler } from "./compiler.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { StatementGenerator } from "./statementGenerator.js";
import { Expression } from "./expression.js";

// This is just a massive hack to avoid circular dependencies.

interface Constructors {
    Compiler: typeof Compiler;
    Statement: typeof Statement;
    StatementBlock: typeof StatementBlock;
    StatementGenerator: typeof StatementGenerator;
    Expression: typeof Expression;
}

export const constructors = {} as Constructors;


