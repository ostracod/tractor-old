
import { Displayable } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { Statement } from "./statement.js";
import { StatementGenerator } from "./statementGenerator.js";
import { Expression } from "./expression.js";
import { Identifier, NumberIdentifier } from "./identifier.js";

class IfClause {
    condition: Expression;
    block: StatementBlock;
    generator: StatementGenerator;
    isFirstClause: boolean;
    isLastClause: boolean;
    startIdentifier: Identifier;
    endIdentifier: Identifier;
    
    constructor(
        parentBlock: StatementBlock,
        statement: Statement,
        isFirstClause: boolean,
        isLastClause: boolean,
        endIdentifier: Identifier
    ) {
        if (statement.type.directive === "ELSE") {
            this.condition = null;
        } else {
            this.condition = statement.args[0];
        }
        this.block = statement.nestedBlock;
        this.generator = statement.createStatementGenerator(parentBlock);
        this.isFirstClause = isFirstClause;
        this.isLastClause = isLastClause;
        if (this.isLastClause) {
            this.startIdentifier = null;
        } else {
            this.startIdentifier = new NumberIdentifier();
        }
        this.endIdentifier = endIdentifier;
    }
    
    addJumpIfStatement(): void {
        if (this.condition === null) {
            return;
        }
        let identifier: Identifier;
        let condition: Expression;
        if (this.isLastClause) {
            identifier = this.endIdentifier;
            condition = this.condition.invertBooleanValue();
        } else {
            identifier = this.startIdentifier;
            condition = this.condition;
        }
        this.generator.addJumpIfStatement(identifier, condition);
    }
    
    addLabelStatement(identifier: Identifier): void {
        this.generator.addLabelStatement(identifier);
    }
    
    addScopeStatement(): void {
        if (this.startIdentifier !== null) {
            this.addLabelStatement(this.startIdentifier);
        }
        this.generator.addScopeStatement(this.block);
        if (!this.isFirstClause) {
            this.generator.addJumpStatement(this.endIdentifier);
        }
    }
}

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
        const clauseStatements: Statement[] = [ifStatement];
        while (index < statements.length) {
            const statement = statements[index];
            const { directive } = statement.type;
            let shouldAddStatement = true;
            let shouldBreak = true;
            if (directive === "ELSE_IF") {
                shouldBreak = false;
            } else if (directive !== "ELSE") {
                shouldAddStatement = false;
            }
            if (shouldAddStatement) {
                clauseStatements.push(statement);
                index += 1;
            }
            if (shouldBreak) {
                break;
            }
        }
        const endIdentifier = new NumberIdentifier();
        const ifClauses = clauseStatements.map((statement, index) => (
            new IfClause(
                this,
                statement,
                (index <= 0),
                (index >= clauseStatements.length - 1),
                endIdentifier,
            )
        ));
        ifClauses.forEach((clause) => {
            clause.addJumpIfStatement();
        });
        for (let index = ifClauses.length - 1; index >= 0; index--) {
            const clause = ifClauses[index];
            clause.addScopeStatement();
        }
        ifClauses[0].addLabelStatement(endIdentifier);
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


