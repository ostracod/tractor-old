
import { Compiler } from "./compiler.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { StatementGenerator } from "./statementGenerator.js";
import { Expression } from "./expression.js";
import { ItemType, IntegerType, ArrayType, VoidType } from "./itemType.js";

// This is just a massive hack to avoid circular dependencies.

interface Constructors {
    Compiler: typeof Compiler;
    StatementBlock: typeof StatementBlock;
    StatementGenerator: typeof StatementGenerator;
    Expression: typeof Expression;
    Statement: typeof Statement;
    ItemType: typeof ItemType;
    IntegerType: typeof IntegerType;
    ArrayType: typeof ArrayType;
    VoidType: typeof VoidType;
}

export const constructors = {} as Constructors;


