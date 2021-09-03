
import { CompilerError } from "./compilerError.js";
import { Node, NodeSlot } from "./node.js";
import { Expression } from "./expression.js";
import { Statement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { ItemType } from "./itemType.js";

export class TypeResolver extends Node {
    expression: NodeSlot<Expression>;
    block: NodeSlot<StatementBlock>;
    type: ItemType;
    
    constructor(expression: Expression) {
        super();
        this.expression = this.addSlot(expression);
        const statements: Statement[] = [];
        const statementGenerator = expression.createStatementGenerator(statements);
        statementGenerator.createReturnStatement(expression.copy());
        const block = expression.createStatementBlock(statements);
        this.block = this.addSlot(block);
        this.type = null;
    }
    
    resolveType(): boolean {
        if (this.type !== null) {
            return false;
        }
        const compItem = this.block.get().evaluateToCompItemOrNull();
        if (compItem === null) {
            return false;
        }
        if (!(compItem instanceof ItemType)) {
            throw this.createError("Expected type.");
        }
        this.type = compItem;
        return true;
    }
    
    getType(): ItemType {
        if (this.type === null) {
            const expressionText = this.expression.get().getDisplayString();
            throw this.createError(`Could not resolve type from "${expressionText}".`);
        }
        return this.type;
    }
    
    getDisplayString() {
        return this.expression.get().getDisplayString();
    }
}


