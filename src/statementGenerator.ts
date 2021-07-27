
import { Pos } from "./pos.js";
import { directiveStatementTypeMap } from "./statementType.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { Expression, IdentifierExpression } from "./expression.js";
import { Identifier } from "./identifier.js";

export class StatementGenerator {
    pos: Pos;
    block: StatementBlock;
    
    constructor(pos: Pos, block: StatementBlock = null) {
        this.pos = pos;
        this.block = block;
    }
    
    createStatement(directive: string, args: Expression[]): Statement {
        const statementType = directiveStatementTypeMap[directive];
        const output = statementType.createStatement([], args);
        output.setPos(this.pos);
        return output;
    }
    
    addStatement(statement: Statement): void {
        this.block.addStatement(statement);
    }
    
    createJumpStatement(identifier: Identifier): Statement {
        return this.createStatement("JUMP", [
            new IdentifierExpression(identifier),
        ]);
    }
    
    addJumpStatement(identifier: Identifier): void {
        const statement = this.createJumpStatement(identifier);
        this.addStatement(statement);
    }
    
    addJumpIfStatement(identifier: Identifier, condition: Expression): void {
        const statement = this.createStatement("JUMP_IF", [
            new IdentifierExpression(identifier),
            condition,
        ]);
        this.addStatement(statement);
    }
    
    addScopeStatement(block: StatementBlock): void {
        const statement = this.createStatement("SCOPE", []);
        statement.nestedBlock = block;
        this.addStatement(statement);
    }
    
    addLabelStatement(identifier: Identifier): void {
        const statement = this.createStatement("LABEL", [
            new IdentifierExpression(identifier),
        ]);
        this.addStatement(statement);
    }
}


