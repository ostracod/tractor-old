
import { Node, NodeSlot } from "./node.js";
import { Expression } from "./expression.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";

export class TypeResolver extends Node {
    expression: NodeSlot<Expression>;
    block: NodeSlot<StatementBlock>;
    
    constructor(expression: Expression) {
        super();
        this.expression = this.addSlot(expression);
        const statements: Statement[] = [];
        const statementGenerator = expression.createStatementGenerator(statements);
        statementGenerator.addReturnStatement(expression.copy());
        const block = expression.createStatementBlock(statements);
        this.block = this.addSlot(block);
    }
    
    // TODO: Add method to resolve a type.
    
    getDisplayString() {
        return "(Unresolved type)";
    }
}


