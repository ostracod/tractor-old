
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
        const statement = statementType.createStatement([], args);
        statement.pos = this.pos;
        if (this.destination !== null) {
            this.destination.push(statement);
        }
        return statement;
    }
    
    createStatement(directive: string, args: Expression[]): Statement {
        const statementType = directiveStatementTypeMap[directive];
        return this.createStatementHelper(statementType, args);
    }
    
    createJumpStatement(identifier: Identifier): Statement {
        return this.createStatement("JUMP", [
            new IdentifierExpression(identifier),
        ]);
    }
    
    createJumpIfStatement(identifier: Identifier, condition: Expression): Statement {
        return this.createStatement("JUMP_IF", [
            new IdentifierExpression(identifier),
            condition,
        ]);
    }
    
    createScopeStatement(block: StatementBlock): Statement {
        const output = this.createStatement("SCOPE", []);
        output.block.set(block);
        return output;
    }
    
    createLabelStatement(identifier: Identifier): Statement {
        return this.createStatement("LABEL", [
            new IdentifierExpression(identifier),
        ]);
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
    createInitStatement(identifier: Identifier, initItemExpression: Expression): Statement {
        const identifierExpression = new IdentifierExpression(identifier);
        const binaryExpression = new BinaryExpression(
            binaryOperatorMap[":="],
            identifierExpression,
            initItemExpression,
        );
        return this.createStatementHelper(expressionStatementType, [binaryExpression]);
    }
    
    createReturnStatement(item: Expression = null): Statement {
        const expressions: Expression[] = (item === null) ? [] : [item];
        return this.createStatement("RET", expressions);
    }
}

constructors.StatementGenerator = StatementGenerator;


