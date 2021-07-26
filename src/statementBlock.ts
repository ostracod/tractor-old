
import { Displayable } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { Statement } from "./statement.js";
import { NumberIdentifier } from "./identifier.js";

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
    
    clearStatements(): Statement[] {
        this.statements.forEach((statement) => {
            statement.clearParentBlock();
        });
        const output = this.statements;
        this.statements = [];
        return output;
    }
    
    collapse(): void {
        const blockStack: StatementBlock[] = [this];
        const statements = this.clearStatements();
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
        const statements = this.clearStatements();
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
    
    transformIfStatement(
        statements: Statement[],
        ifStatement: Statement,
        index: number,
    ): number {
        const elseIfStatements: Statement[] = [];
        let elseStatement = null;
        while (index < statements.length) {
            const statement = statements[index];
            const { directive } = statement.type;
            if (directive === "ELSE_IF") {
                elseIfStatements.push(statement);
                index += 1;
            } else if (directive === "ELSE") {
                elseStatement = statement;
                index += 1;
                break;
            } else {
                break;
            }
        }
        const { pos } = ifStatement;
        const condition = ifStatement.args[0];
        const identifier = new NumberIdentifier();
        const generator = ifStatement.createStatementGenerator(this);
        generator.addJumpIfStatement(identifier, condition.invertBooleanValue());
        generator.addScopeStatement(ifStatement.nestedBlock);
        generator.addLabelStatement(identifier);
        // TODO: Handle elseIfStatements and elseStatement.
        
        return index;
    }
    
    transformWhileStatement(statements: Statement[], whileStatement: Statement): void {
        // TODO: Implement.
        
    }
    
    transformControlFlow(): void {
        const statements = this.clearStatements();
        let index = 0;
        while (index < statements.length) {
            const statement = statements[index];
            index += 1;
            const { nestedBlock } = statement;
            if (nestedBlock !== null) {
                nestedBlock.transformControlFlow();
            }
            const { directive } = statement.type;
            if (directive === "IF") {
                index = this.transformIfStatement(statements, statement, index);
            } else if (directive === "WHILE") {
                this.transformWhileStatement(statements, statement);
            } else {
                this.addStatement(statement);
            }
        }
    }
    
    getDisplayString(indentationLevel = 0): string {
        return this.statements.map((statement) => (
            statement.getDisplayString(indentationLevel)
        )).join("\n");
    }
}


