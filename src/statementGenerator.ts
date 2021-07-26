
import { Pos } from "./pos.js";
import { directiveStatementTypeMap as statementTypes } from "./statementType.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { Expression, IdentifierExpression } from "./expression.js";
import { Identifier } from "./identifier.js";

export class StatementGenerator {
    block: StatementBlock;
    pos: Pos;
    
    constructor(block: StatementBlock, pos: Pos) {
        this.block = block;
        this.pos = pos;
    }
    
    addStatement(statement: Statement): void {
        statement.setPos(this.pos);
        this.block.addStatement(statement);
    }
    
    addJumpIfStatement(identifier: Identifier, condition: Expression): void {
        const statement = statementTypes.JUMP_IF.createStatement([], [
            new IdentifierExpression(identifier),
            condition
        ]);
        this.addStatement(statement);
    }
    
    addScopeStatement(block: StatementBlock): void {
        const statement = statementTypes.SCOPE.createStatement([], []);
        statement.nestedBlock = block;
        this.addStatement(statement);
    }
    
    addLabelStatement(identifier: Identifier): void {
        const statement = statementTypes.LABEL.createStatement([], [
            new IdentifierExpression(identifier),
        ]);
        this.addStatement(statement);
    }
}


