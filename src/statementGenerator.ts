
import { Pos } from "./pos.js";
import { directiveStatementTypeMap } from "./statementType.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { Expression, IdentifierExpression } from "./expression.js";
import { Identifier } from "./identifier.js";

export class StatementGenerator {
    pos: Pos;
    destination: Statement[];
    
    constructor(pos: Pos, destination: Statement[] = null) {
        this.pos = pos;
        this.destination = destination;
    }
    
    createStatement(directive: string, args: Expression[]): Statement {
        const statementType = directiveStatementTypeMap[directive];
        const output = statementType.createStatement([], args);
        output.pos = this.pos;
        return output;
    }
    
    addStatement(statement: Statement): void {
        this.destination.push(statement);
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
    
    createScopeStatement(block: StatementBlock): Statement {
        const output = this.createStatement("SCOPE", []);
        output.block.set(block);
        return output;
    }
    
    addScopeStatement(block: StatementBlock): void {
        const statement = this.createScopeStatement(block);
        this.addStatement(statement);
    }
    
    addLabelStatement(identifier: Identifier): void {
        const statement = this.createStatement("LABEL", [
            new IdentifierExpression(identifier),
        ]);
        this.addStatement(statement);
    }
}


