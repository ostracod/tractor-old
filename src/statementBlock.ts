
import { Displayable } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { Statement } from "./statement.js";

export class StatementBlock implements Displayable {
    statements: Statement[];
    parentBlock: StatementBlock;
    
    constructor(statements: Statement[] = []) {
        this.statements = [];
        statements.forEach((statement) => {
            this.addStatement(statement);
        });
        this.parentBlock = null;
    }
    
    addStatement(statement: Statement): void {
        this.statements.push(statement);
        statement.setParentBlock(this);
    }
    
    clearStatements(): void {
        this.statements.forEach((statement) => {
            statement.clearParentBlock();
        });
        this.statements = [];
    }
    
    collapse(): void {
        const blockStack: StatementBlock[] = [this];
        const { statements } = this;
        this.clearStatements();
        statements.forEach((statement) => {
            const statementType = statement.type;
            if (statementType.isBlockEnd) {
                blockStack.pop();
                if (blockStack.length <= 0) {
                    throw statement.createError(
                        `Unexpected "${statementType.directive}" statement.`,
                    );
                }
                if (!statementType.isBlockStart) {
                    return;
                }
            }
            const lastBlock = blockStack[blockStack.length - 1];
            if (statementType.isBlockStart) {
                const block = new StatementBlock();
                statement.nestedBlock = block;
                blockStack.push(block);
            }
            lastBlock.addStatement(statement);
        });
    }
    
    // If processStatement returns a list of statements, then the
    // list will replace the original statement. If processStatement
    // returns null, then no modification occurs.
    processStatements(
        processStatement: (statement: Statement) => Statement[],
        shouldProcessNestedBlocks = false,
    ): void {
        const { statements } = this;
        this.clearStatements();
        statements.forEach((statement) => {
            const result = processStatement(statement);
            if (result === null) {
                this.addStatement(statement);
            } else {
                result.forEach((resultStatement) => {
                    this.addStatement(resultStatement);
                });
            }
        });
    }
    
    getDisplayString(indentationLevel = 0): string {
        return this.statements.map((statement) => (
            statement.getDisplayString(indentationLevel)
        )).join("\n");
    }
}


