
import { IdentifierDefinition } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { constructors } from "./constructors.js";
import { Node, NodeSlot } from "./node.js";
import { Pos } from "./pos.js";
import { Statement, VariableStatement, FieldStatement, FieldsTypeStatement, ScopeStatement, JumpIfStatement } from "./statement.js";
import { StatementGenerator } from "./statementGenerator.js";
import { StatementPancake } from "./statementPancake.js";
import { Expression } from "./expression.js";
import { Identifier, NumberIdentifier } from "./identifier.js";
import { IdentifierDefinitionMap } from "./identifierDefinitionMap.js";
import { InitFunctionDefinition } from "./functionDefinition.js";
import { TypeResolver } from "./typeResolver.js";
import { FieldDefinition } from "./singleTypeDefinition.js";
import { FunctionTypeDefinition } from "./typeDefinition.js";
import { ArgVariableDefinition } from "./variableDefinition.js";
import { FunctionSignature } from "./functionSignature.js";
import { BuiltInDefinition, createBuiltInDefinitionMap } from "./builtInDefinition.js";
import { CompItem } from "./compItem.js";

class IfClause {
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
        if (statement.type.directive === "ELSE") {
            this.condition = null;
        } else {
            this.condition = statement.args[0].get();
        }
        this.generator = statement.createStatementGenerator(destination);
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
        this.generator.createJumpIfStatement(identifier, condition);
    }
    
    addLabelStatement(identifier: Identifier): void {
        this.generator.createLabelStatement(identifier);
    }
    
    addScopeStatement(): void {
        if (this.startIdentifier !== null) {
            this.addLabelStatement(this.startIdentifier);
        }
        this.generator.createScopeStatement(this.block);
        if (!this.isFirstClause) {
            this.generator.createJumpStatement(this.endIdentifier);
        }
    }
}

export type StatementBlockConstructor = new (
    pos?: Pos,
    statements?: Statement[],
) => StatementBlock;

export class StatementBlock extends Node {
    statements: NodeSlot<Statement>[];
    scope: NodeSlot<IdentifierDefinitionMap>;
    
    constructor(pos: Pos = null, statements: Statement[] = []) {
        super();
        this.pos = pos;
        this.statements = [];
        this.setStatements(statements);
        this.scope = this.addSlot(new IdentifierDefinitionMap());
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
    
    processBlockStatements(handle: (statement: Statement) => Statement[]): number {
        let output = 0;
        const nextStatements = [];
        this.statements.forEach((slot) => {
            const statement = slot.get();
            const result = handle(statement);
            if (result === null) {
                output += statement.processBlockStatements(handle);
                nextStatements.push(statement);
            } else {
                if (result.length !== 1 || result[0] !== statement) {
                    output += 1;
                }
                niceUtils.extendList(nextStatements, result);
            }
        });
        this.setStatements(nextStatements);
        return output;
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
            } else if (directive === "WHILE") {
                return [statement];
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
        generator.createLabelStatement(startIdentifier);
        generator.createJumpIfStatement(endIdentifier, condition);
        generator.createScopeStatement(nestedBlock);
        generator.createJumpStatement(startIdentifier);
        generator.createLabelStatement(endIdentifier);
    }
    
    transformJumpIfStatement(
        destination: Statement[],
        jumpIfStatement: JumpIfStatement,
    ): boolean {
        const conditionExpression = jumpIfStatement.getConditionExpression();
        const compItem = conditionExpression.evaluateToCompItemOrNull();
        if (compItem === null) {
            destination.push(jumpIfStatement);
            return false;
        }
        if (!compItem.convertToBoolean()) {
            return true;
        }
        const generator = jumpIfStatement.createStatementGenerator(destination);
        const identifierExpression = jumpIfStatement.args[0].get();
        const identifier = identifierExpression.evaluateToIdentifier();
        generator.createJumpStatement(identifier);
        return true;
    }
    
    transformControlFlow(): number {
        let output = 0;
        const nextStatements = [];
        let index = 0;
        while (index < this.statements.length) {
            const statement = this.statements[index].get();
            index += 1;
            const { directive } = statement.type;
            if (directive === "IF") {
                index = this.transformIfStatement(nextStatements, statement, index);
                output += 1;
            } else if (directive === "WHILE") {
                this.transformWhileStatement(nextStatements, statement);
                output += 1;
            } else if (statement instanceof JumpIfStatement) {
                const result = this.transformJumpIfStatement(nextStatements, statement);
                if (result) {
                    output += 1;
                }
            } else {
                nextStatements.push(statement);
            }
        }
        this.setStatements(nextStatements);
        return output;
    }
    
    extractVariableDefinitions(): number {
        return this.processBlockStatements((statement) => {
            if (statement instanceof VariableStatement) {
                return statement.createVariableDefinition().statements;
            } else {
                return [statement];
            }
        });
    }
    
    extractFieldDefinitions(): FieldDefinition[] {
        const output: FieldDefinition[] = [];
        this.processBlockStatements((statement) => {
            if (statement instanceof FieldStatement) {
                const definition = statement.createFieldDefinition();
                output.push(definition);
                return [];
            }
            return [statement];
        });
        return output;
    }
    
    extractTypeDefinitions(): number {
        return this.processBlockStatements((statement) => {
            if (statement instanceof FieldsTypeStatement) {
                (statement as FieldsTypeStatement).createDefinition();
                return [];
            } else if (statement.type.directive === "FUNC_TYPE") {
                const identifierBehavior = statement.createIdentifierBehavior();
                const block = statement.block.get();
                const definition = new FunctionTypeDefinition(
                    this.getPos(),
                    identifierBehavior,
                    block,
                );
                this.addIdentifierDefinition(definition);
                return [];
            }
            return [statement];
        });
    }
    
    createFunctionSignature(): FunctionSignature {
        const argVariableDefinitions: NodeSlot<ArgVariableDefinition>[] = [];
        let returnTypeResolver: NodeSlot<TypeResolver> = this.addSlot();
        this.processBlockStatements((statement) => {
            const { directive } = statement.type;
            if (directive === "ARG") {
                const result = (statement as VariableStatement<ArgVariableDefinition>).createVariableDefinition();
                argVariableDefinitions.push(result.variableDefinition);
                return result.statements;
            } else if (directive === "RET_TYPE") {
                if (returnTypeResolver.get() !== null) {
                    throw statement.createError("Extra RET_TYPE statement.");
                }
                const expression = statement.args[0].get();
                returnTypeResolver.set(new TypeResolver(expression));
                return [];
            }
            return [statement];
        });
        return new FunctionSignature(argVariableDefinitions, returnTypeResolver);
    }
    
    evaluateToCompItemOrNull(): CompItem {
        const { returnCompItems } = this.getPancake();
        return (returnCompItems.length === 1) ? returnCompItems[0] : null;
    }
    
    getFlattenedStatements(): Statement[] {
        const output: Statement[] = [];
        this.statements.forEach((slot) => {
            const statement = slot.get();
            if (statement instanceof ScopeStatement) {
                const statements = statement.block.get().getFlattenedStatements();
                niceUtils.extendList(output, statements);
            } else {
                output.push(statement);
            }
        });
        return output;
    }
    
    getPancake(): StatementPancake {
        const statements = this.getFlattenedStatements();
        return new StatementPancake(statements);
    }
    
    removeUnreachableStatements(): number {
        
        // Create a list of all statements and some book-keeping data.
        const { statements, reachabilityMap } = this.getPancake();
        const blocks = new Set<StatementBlock>();
        statements.forEach((statement) => {
            blocks.add(statement.getParentBlock());
        });
        
        // Remove unreachable statements from each block.
        let output = 0;
        blocks.forEach((block) => {
            const nextStatements: Statement[] = [];
            block.statements.forEach((slot) => {
                const statement = slot.get();
                const isReachable = reachabilityMap.get(statement);
                if (typeof isReachable === "undefined" || isReachable) {
                    nextStatements.push(statement);
                } else {
                    output += 1;
                }
            });
            block.setStatements(nextStatements);
        });
        
        return output;
    }
    
    getDisplayLines(): string[] {
        const output = [];
        this.scope.get().iterate((definition) => {
            niceUtils.extendList(output, definition.getDisplayLines())
        });
        this.statements.forEach((slot) => {
            niceUtils.extendList(output, slot.get().getDisplayLines())
        });
        return output;
    }
    
    getDisplayString(): string {
        return this.getDisplayLines().join("\n");
    }
    
    convertToUnixC(): string {
        const codeList = [];
        this.scope.get().iterate((definition) => {
            if (!definition.identifierBehavior.shouldConvertDefinitionToCode()) {
                return;
            }
            const code = definition.convertToUnixC();
            if (code !== null) {
                codeList.push(code);
            }
        });
        this.statements.forEach((slot) => {
            const statement = slot.get();
            codeList.push(statement.convertToUnixC());
        });
        return codeList.join("\n");
    }
    
    copy(): StatementBlock {
        const statements = this.statements.map((slot) => slot.get().copy());
        return new (this.constructor as StatementBlockConstructor)(this.pos, statements);
    }
}

export class RootStatementBlock extends StatementBlock {
    initFunctionDefinition: NodeSlot<InitFunctionDefinition>;
    builtInDefinitionMap: NodeSlot<IdentifierDefinitionMap<BuiltInDefinition>>;
    
    constructor(pos: Pos = null, statements: Statement[] = []) {
        super(pos, statements);
        this.initFunctionDefinition = this.addSlot();
        const definitionMap = createBuiltInDefinitionMap();
        this.builtInDefinitionMap = this.addSlot(definitionMap);
    }
    
    getDisplayLines(): string[] {
        const output = super.getDisplayLines();
        const initFunctionDefinition = this.initFunctionDefinition.get();
        if (initFunctionDefinition !== null) {
            niceUtils.extendList(output, initFunctionDefinition.getDisplayLines());
        }
        return output;
    }
    
    getIdentifierDefinition(identifier: Identifier): IdentifierDefinition {
        const definition = super.getIdentifierDefinition(identifier);
        if (definition === null) {
            return this.builtInDefinitionMap.get().get(identifier);
        } else {
            return definition;
        }
    }
    
    convertToUnixC(): string {
        const initFunctionDefinition = this.initFunctionDefinition.get();
        const codeList = [
            super.convertToUnixC(),
            initFunctionDefinition.convertToUnixC(),
        ];
        return codeList.join("\n");
    }
}

constructors.StatementBlock = StatementBlock;


