
import { IdentifierDefinition } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { constructors } from "./constructors.js";
import { Node, NodeSlot } from "./node.js";
import { Pos } from "./pos.js";
import { Statement } from "./statement.js";
import { StatementGenerator } from "./statementGenerator.js";
import { Expression } from "./expression.js";
import { Identifier, NumberIdentifier } from "./identifier.js";
import { Scope } from "./scope.js";
import { InitFunctionDefinition } from "./functionDefinition.js";

class IfClause {
    destination: Statement[];
    condition: Expression;
    generator: StatementGenerator;
    block: StatementBlock;
    isFirstClause: boolean;
    isLastClause: boolean;
    startIdentifier: Identifier;
    endIdentifier: Identifier;
    
    constructor(
        destination: Statement[],
        statement: Statement,
        isFirstClause: boolean,
        isLastClause: boolean,
        endIdentifier: Identifier,
    ) {
        this.destination = destination;
        if (statement.type.directive === "ELSE") {
            this.condition = null;
        } else {
            this.condition = statement.args[0].get();
        }
        this.generator = statement.createStatementGenerator(this.destination);
        this.block = statement.block.get();
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

export type StatementBlockConstructor = new (
    pos?: Pos,
    statements?: Statement[],
) => StatementBlock;

export class StatementBlock extends Node {
    statements: NodeSlot<Statement>[];
    scope: NodeSlot<Scope>;
    
    constructor(pos: Pos = null, statements: Statement[] = []) {
        super();
        this.pos = pos;
        this.statements = [];
        this.setStatements(statements);
        this.scope = this.addSlot(new Scope());
    }
    
    addStatement(statement: Statement): void {
        const slot = this.addSlot(statement);
        this.statements.push(slot);
    }
    
    setStatements(statements: Statement[]): void {
        this.statements.forEach((slot) => {
            this.removeSlot(slot);
        });
        this.statements = [];
        statements.forEach((statement) => {
            this.addStatement(statement);
        });
    }
    
    getIdentifierDefinition(identifier: Identifier): IdentifierDefinition {
        const definition = this.scope.get().get(identifier);
        if (definition !== null) {
            return definition;
        }
        const parentBlock = this.getParentBlock();
        if (parentBlock !== null) {
            return parentBlock.getIdentifierDefinition(identifier);
        }
        return null;
    }
    
    addIdentifierDefinition<T extends IdentifierDefinition>(definition: T): NodeSlot<T> {
        return this.scope.get().add(definition);
    }
    
    processBlockStatements(handle: (statement: Statement) => Statement[]): void {
        const nextStatements = [];
        this.statements.forEach((slot) => {
            const statement = slot.get();
            const result = handle(statement);
            if (result === null) {
                statement.processBlockStatements(handle);
                nextStatements.push(statement);
            } else {
                niceUtils.extendList(nextStatements, result);
            }
        });
        this.setStatements(nextStatements);
    }
    
    transformIfStatement(
        destination: Statement[],
        ifStatement: Statement,
        index: number,
    ): number {
        const clauseStatements: Statement[] = [ifStatement];
        while (index < this.statements.length) {
            const statement = this.statements[index].get();
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
                destination,
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
    
    transformBreakAndContinueStatements(
        startIdentifier: Identifier,
        endIdentifier: Identifier,
    ): void {
        this.processBlockStatements((statement) => {
            const { directive } = statement.type;
            let identifier: Identifier = null;
            if (directive === "BREAK") {
                identifier = endIdentifier;
            } else if (directive === "CONTINUE") {
                identifier = startIdentifier;
            } else {
                return null;
            }
            const generator = statement.createStatementGenerator();
            return [generator.createJumpStatement(identifier)];
        });
    }
    
    transformWhileStatement(destination: Statement[], whileStatement: Statement): void {
        const generator = whileStatement.createStatementGenerator(destination);
        const startIdentifier = new NumberIdentifier();
        const endIdentifier = new NumberIdentifier();
        const condition = whileStatement.args[0].get().invertBooleanValue();
        const nestedBlock = whileStatement.block.get();
        nestedBlock.transformBreakAndContinueStatements(startIdentifier, endIdentifier);
        generator.addLabelStatement(startIdentifier);
        generator.addJumpIfStatement(endIdentifier, condition);
        generator.addScopeStatement(nestedBlock);
        generator.addJumpStatement(startIdentifier);
        generator.addLabelStatement(endIdentifier);
    }
    
    transformControlFlow(): void {
        const nextStatements = [];
        let index = 0;
        while (index < this.statements.length) {
            const statement = this.statements[index].get();
            index += 1;
            const nestedBlock = statement.block.get();
            if (nestedBlock !== null) {
                nestedBlock.transformControlFlow();
            }
            const { directive } = statement.type;
            if (directive === "IF") {
                index = this.transformIfStatement(nextStatements, statement, index);
            } else if (directive === "WHILE") {
                this.transformWhileStatement(nextStatements, statement);
            } else {
                nextStatements.push(statement);
            }
        }
        this.setStatements(nextStatements);
    }
    
    getDisplayString(indentationLevel = 0): string {
        return this.statements.map((slot) => (
            slot.get().getDisplayString(indentationLevel)
        )).join("\n");
    }
    
    copy(): StatementBlock {
        const statements = this.statements.map((slot) => slot.get().copy());
        return new (this.constructor as StatementBlockConstructor)(this.pos, statements);
    }
}

export class RootStatementBlock extends StatementBlock {
    initFunctionDefinition: NodeSlot<InitFunctionDefinition>;
    
    constructor(pos: Pos = null, statements: Statement[] = []) {
        super(pos, statements);
        this.initFunctionDefinition = this.addSlot();
    }
}

constructors.StatementBlock = StatementBlock;


