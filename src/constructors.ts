
import { StatementBlock } from "./statementBlock.js";
import { StatementGenerator } from "./statementGenerator.js";

// This is just a massive hack to avoid circular dependencies.

interface Constructors {
    StatementBlock: typeof StatementBlock;
    StatementGenerator: typeof StatementGenerator;
}

export const constructors = {} as Constructors;


