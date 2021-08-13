
import { constructors } from "./constructors.js";
import { Pos } from "./pos.js";
import { StatementType, directiveStatementTypeMap, expressionStatementType } from "./statementType.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { Expression, IdentifierExpression, BinaryExpression } from "./expression.js";
import { Identifier } from "./identifier.js";
import { binaryOperatorMap } from "./operator.js";

export class StatementGenerator {
    pos: Pos;
    destination: Statement[];
    
    constructor(pos: Pos, destination: Statement[] = null) {
        this.pos = pos;
        this.destination = destination;
    }
    
    createStatementHelper(statementType: StatementType, args: Expression[]): Statement {
        const output = statementType.createStatement([], args);
        output.pos = this.pos;
        return output;
    }
    
    createStatement(directive: string, args: Expression[]): Statement {
        const statementType = directiveStatementTypeMap[directive];
        return this.createStatementHelper(statementType, args);
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
    
    createSoftVarStatement(
        identifier: Identifier,
        typeExpression: Expression,
        initItem: Expression = null,
    ): Statement {
        const args = [
            new IdentifierExpression(identifier),
            typeExpression,
        ];
        if (initItem !== null) {
            args.push(initItem);
        }
        return this.createStatement("SOFT_VAR", args);
    }
    
    addSoftVarStatement(
        identifier: Identifier,
        typeExpression: Expression,
        initItem: Expression = null,
    ): void {
        const statement = this.createSoftVarStatement(identifier, typeExpression, initItem);
        this.addStatement(statement);
    }
    
    createInitStatement(identifier: Identifier, initItemExpression: Expression) {
        const identifierExpression = new IdentifierExpression(identifier);
        const binaryExpression = new BinaryExpression(
            binaryOperatorMap[":="],
            identifierExpression,
            initItemExpression,
        );
        return this.createStatementHelper(expressionStatementType, [binaryExpression]);
    }
}

constructors.StatementGenerator = StatementGenerator;


