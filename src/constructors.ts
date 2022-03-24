
import { Compiler } from "./compiler.js";
import { Statement } from "./statement/statement.js";
import { StatementBlock } from "./statement/statementBlock.js";
import { StatementGenerator } from "./statement/statementGenerator.js";
import { Expression } from "./statement/expression.js";
import { BasicType, TypeType } from "./compItem/basicType.js";
import { CompType, ConcreteType } from "./compItem/storageType.js";
import { OrType } from "./compItem/manipulationType.js";

// This is just a massive hack to avoid circular dependencies.

interface Constructors {
    Compiler: typeof Compiler;
    Statement: typeof Statement;
    StatementBlock: typeof StatementBlock;
    StatementGenerator: typeof StatementGenerator;
    Expression: typeof Expression;
    BasicType: typeof BasicType;
    TypeType: typeof TypeType;
    CompType: typeof CompType;
    ConcreteType: typeof ConcreteType;
    OrType: typeof OrType;
}

export const constructors = {} as Constructors;


