
import * as niceUtils from "../niceUtils.js";
import { IdentifierMap } from "../identifier.js";
import { InitableVariableDefinition } from "../definition/variableDefinition.js";
import { DefinitionMap } from "../definition/definitionMap.js";
import { CompItem } from "../compItem/compItem.js";
import { CompVoid } from "../compItem/compValue.js";
import { initializationOperator } from "./operator.js";
import { Expression, BinaryExpression } from "./expression.js";
import { Statement, LabelStatement, JumpStatement, JumpIfStatement, ExpressionStatement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";

interface StatementOperand {
    statement: ExpressionStatement;
    operand: Expression;
}

export class StatementPancake {
    baseBlock: StatementBlock;
    statements: Statement[];
    scopes: DefinitionMap[];
    uselessStatements: Set<Statement>;
    labelIndexMap: IdentifierMap<number>;
    reachabilityMap: Map<Statement, boolean>;
    returnCompItems: CompItem[];
    
    // Assumes that transformControlFlow has been called on baseBlock.
    constructor(baseBlock: StatementBlock) {
        this.baseBlock = baseBlock;
        const result = this.baseBlock.getFlattenedStatements();
        this.statements = result.statements;
        this.scopes = result.scopes;
        this.uselessStatements = new Set();
        this.labelIndexMap = null;
        this.reachabilityMap = null;
        this.returnCompItems = null;
    }
    
    getNextIndexes(index: number): number[] {
        const statement = this.statements[index];
        let canAdvance = false;
        let canJump = false;
        if (statement instanceof JumpStatement) {
            canJump = true;
        } else if (statement instanceof JumpIfStatement) {
            canAdvance = true;
            canJump = true;
        } else if (statement.type.directive !== "RET") {
            canAdvance = true;
        }
        const output: number[] = [];
        if (canAdvance) {
            const nextIndex = index + 1;
            if (nextIndex < this.statements.length) {
                output.push(nextIndex);
            }
        }
        if (canJump) {
            const identifier = statement.getIdentifier();
            output.push(this.labelIndexMap.get(identifier));
        }
        return output;
    }
    
    determineReachabilityHelper(): { returnsVoid: boolean, returnsUnresolvedItem: boolean } {
        if (this.statements.length <= 0) {
            return { returnsVoid: true, returnsUnresolvedItem: false };
        }
        let returnsVoid = false;
        let returnsUnresolvedItem = false;
        const indexesToVisit: number[] = [0];
        while (indexesToVisit.length > 0) {
            const index = indexesToVisit.pop();
            const statement = this.statements[index];
            if (this.reachabilityMap.get(statement)) {
                continue;
            }
            if (statement.type.directive === "RET") {
                if (statement.args.length <= 0) {
                    returnsVoid = true;
                } else {
                    const expression = statement.args[0].get();
                    const item = expression.evaluateToCompItemOrNull();
                    if (item === null) {
                        returnsUnresolvedItem = true;
                    } else {
                        this.returnCompItems.push(item);
                    }
                }
            }
            this.reachabilityMap.set(statement, true);
            const nextIndexes = this.getNextIndexes(index);
            niceUtils.extendList(indexesToVisit, nextIndexes);
        }
        return { returnsVoid, returnsUnresolvedItem };
    }
    
    determineReachability(): void {
        this.labelIndexMap = new IdentifierMap();
        this.statements.forEach((statement, index) => {
            if (statement instanceof LabelStatement) {
                const identifier = statement.getDeclarationIdentifier();
                this.labelIndexMap.add(identifier, index);
            }
        });
        this.reachabilityMap = new Map();
        this.statements.forEach((statement) => {
            this.reachabilityMap.set(statement, false);
        });
        this.returnCompItems = [];
        const { returnsVoid, returnsUnresolvedItem } = this.determineReachabilityHelper();
        if (returnsVoid) {
            this.returnCompItems.push(new CompVoid());
        }
        if (returnsUnresolvedItem) {
            this.returnCompItems.push(null);
        }
    }
    
    markUnreachableAsUseless(): void {
        this.reachabilityMap.forEach((isReachable, statement) => {
            if (!isReachable) {
                this.uselessStatements.add(statement);
            }
        });
    }
    
    markUselessJumpStatements(): void {
        let lastUsefulStatement: Statement = null;
        this.statements.forEach((statement, index) => {
            if (this.uselessStatements.has(statement)) {
                return;
            }
            let pairIsUseless: boolean;
            if (lastUsefulStatement instanceof JumpStatement
                    && statement instanceof LabelStatement) {
                const jumpIdentifier = lastUsefulStatement.getIdentifier();
                const labelIdentifier = statement.getDeclarationIdentifier();
                pairIsUseless = jumpIdentifier.equals(labelIdentifier);
            } else {
                pairIsUseless = false;
            }
            if (pairIsUseless) {
                this.uselessStatements.add(lastUsefulStatement);
                lastUsefulStatement = null;
            } else {
                lastUsefulStatement = statement;
            }
        });
    }
    
    resolveInitItems(): void {
        
        // Create a map from variable definition to init expressions.
        const statementOperandsMap: Map<InitableVariableDefinition, StatementOperand[]> = new Map();
        this.statements.forEach((statement) => {
            if (!(statement instanceof ExpressionStatement)) {
                return;
            }
            const expression = statement.getExpression();
            if (!(expression instanceof BinaryExpression)
                    || expression.operator !== initializationOperator) {
                return;
            }
            const operand1 = expression.operand1.get();
            const operand2 = expression.operand2.get();
            const definition = operand1.getDefinition();
            if (!(definition instanceof InitableVariableDefinition)) {
                throw operand1.createError("Expected variable definition.");
            }
            if (definition.getPancakeBase() !== this.baseBlock) {
                throw operand1.createError("Cannot initialize this variable here.");
            }
            let statementOperands: StatementOperand[];
            if (statementOperandsMap.has(definition)) {
                statementOperands = statementOperandsMap.get(definition);
            } else {
                statementOperands = [];
                statementOperandsMap.set(definition, statementOperands);
            }
            statementOperands.push({ statement, operand: operand2 });
        });
        
        // Handle init expressions in all variable definitions.
        statementOperandsMap.forEach((statementOperands, definition) => {
            definition.hasInitExpression = (statementOperands.length > 0);
            if (statementOperands.length !== 1) {
                return;
            }
            const { statement, operand } = statementOperands[0];
            const hasHandledStatement = definition.handleInitExpression(operand);
            if (hasHandledStatement) {
                this.uselessStatements.add(statement);
            }
        });
        
        // Register missing init expressions for all other variable definitions.
        this.scopes.forEach((scope) => {
            scope.iterate((definition) => {
                if (definition instanceof InitableVariableDefinition
                        && definition.hasInitExpression === null) {
                    definition.hasInitExpression = false;
                }
            });
        });
    }
    
    removeUselessStatements(): number {
        const blocks = new Set<StatementBlock>();
        this.statements.forEach((statement) => {
            blocks.add(statement.getParentBlock());
        });
        let output = 0;
        blocks.forEach((block) => {
            const nextStatements: Statement[] = [];
            block.statements.forEach((slot) => {
                const statement = slot.get();
                if (this.uselessStatements.has(statement)) {
                    output += 1;
                } else {
                    nextStatements.push(statement);
                }
            });
            block.setStatements(nextStatements);
        });
        return output;
    }
}


