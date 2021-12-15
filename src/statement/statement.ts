
import * as niceUtils from "../niceUtils.js";
import { constructors } from "../constructors.js";
import { Node, NodeSlot, processNodeList } from "../node.js";
import { Identifier, NumberIdentifier, IdentifierMap } from "../identifier.js";
import { IdentifierBehavior, ForeignIdentifierBehavior } from "../identifierBehavior.js";
import { Compiler } from "../compiler.js";
import { FunctionDefinitionConstructor, NonInlineFunctionDefinition, InlineFunctionDefinition } from "../definition/functionDefinition.js";
import { VariableDefinition } from "../definition/variableDefinition.js";
import { SingleTypeDefinition, FieldDefinition } from "../definition/singleTypeDefinition.js";
import { FieldsTypeDefinition } from "../definition/typeDefinition.js";
import { StatementType, SimpleDefinitionStatementType, FieldsTypeStatementType } from "./statementType.js";
import { StatementBlock } from "./statementBlock.js";
import { Expression, IdentifierExpression } from "./expression.js";

export type StatementConstructor<T extends Statement = Statement> = new (
    type: T["type"],
    modifiers: string[],
    args: Expression[],
) => T;

export class Statement extends Node {
    type: StatementType;
    modifiers: string[];
    args: NodeSlot<Expression>[];
    block: NodeSlot<StatementBlock>;
    
    constructor(type: StatementType, modifiers: string[], args: Expression[]) {
        super();
        this.type = type;
        this.modifiers = modifiers;
        this.args = this.addSlots(args);
        this.block = this.addSlot();
        this.type.validateModifiers(this.modifiers);
        this.type.validateArgCount(this.args.length);
    }
    
    getIdentifierSlot(): NodeSlot<Expression> {
        return this.type.hasIdentifierArg ? this.args[0] : null;
    }
    
    getIdentifier(): Identifier {
        return this.getIdentifierSlot().get().evaluateToIdentifier();
    }
    
    getDeclarationIdentifierSlot(): NodeSlot<Expression> {
        return this.type.hasDeclarationIdentifier ? this.getIdentifierSlot() : null;
    }
    
    getDeclarationIdentifier(): Identifier {
        const identifierExpression = this.getDeclarationIdentifierSlot().get();
        return identifierExpression.evaluateToIdentifier();
    }
    
    createIdentifierBehavior(): IdentifierBehavior {
        const identifier = this.getDeclarationIdentifier();
        if (this.modifiers.includes("FOREIGN")) {
            return new ForeignIdentifierBehavior(identifier);
        } else {
            return new IdentifierBehavior(identifier);
        }
    }
    
    createDeclarationIdentifiers(destination: IdentifierMap<Identifier>): void {
        const slot = this.getDeclarationIdentifierSlot();
        if (slot === null) {
            this.processStatements((statement) => {
                statement.createDeclarationIdentifiers(destination);
                return statement;
            });
        } else {
            const oldIdentifier = slot.get().evaluateToIdentifier();
            const newIdentifier = new NumberIdentifier();
            const expression = new IdentifierExpression(newIdentifier);
            slot.set(expression);
            destination.add(oldIdentifier, newIdentifier);
        }
    }
    
    processArgExpressions(handle: (expression: Expression) => Expression): number {
        return processNodeList(this.args, handle, (expression, handle) => (
            expression.processExpressions(handle)
        ));
    }
    
    expandInlineFunctions(): Statement[] {
        const statements = [];
        this.processArgExpressions((expression) => {
            const result = expression.expandInlineFunctions();
            if (result === null) {
                return null;
            }
            niceUtils.extendList(statements, result.statements);
            return result.expression;
        });
        if (statements.length <= 0) {
            return [this];
        }
        statements.push(this);
        const block = this.createStatementBlock(statements);
        const generator = this.createStatementGenerator();
        const scopeStatement = generator.createScopeStatement(block);
        return [scopeStatement];
    }
    
    getDisplayLines(): string[] {
        let textList = this.modifiers.slice();
        const { directive } = this.type;
        if (directive !== null) {
            textList.push(directive);
        }
        if (this.args.length > 0) {
            const argsText = this.args.map((slot) => (
                slot.get().getDisplayString()
            )).join(", ");
            textList.push(argsText);
        }
        const output = [textList.join(" ")];
        const nestedBlock = this.block.get();
        if (nestedBlock !== null) {
            niceUtils.extendWithIndentation(output, nestedBlock.getDisplayLines());
        }
        return output;
    }
    
    getDisplayString(): string {
        return this.getDisplayLines().join("\n");
    }
    
    convertToUnixC(): string {
        throw this.createError(`Unexpected ${this.type.directive} statement.`);
    }
    
    copy(): Statement {
        const args = this.args.map((slot) => slot.get().copy());
        const output = new (this.constructor as StatementConstructor)(
            this.type,
            this.modifiers.slice(),
            args,
        );
        output.pos = this.pos;
        const block = this.block.get();
        if (block !== null) {
            output.block.set(block.copy());
        }
        return output;
    }
}

export abstract class ImportStatement extends Statement {
    
    abstract importFilesHelper(compiler: Compiler): void;
    
    getImportString(): string {
        return this.args[0].get().evaluateToString();
    }
    
    importFiles(compiler: Compiler): void {
        this.tryOperation(() => {
            this.importFilesHelper(compiler);
        });
    }
}

export class PathImportStatement extends ImportStatement {
    
    importFilesHelper(compiler: Compiler): void {
        const path = this.getImportString();
        compiler.importTractorFile(path);
    }
}

export class ConfigImportStatement extends ImportStatement {
    
    importFilesHelper(compiler: Compiler): void {
        const name = this.getImportString();
        const path = compiler.configImportMap[name];
        compiler.importTractorFile(path);
    }
}

export class ForeignImportStatement extends ImportStatement {
    
    importFilesHelper(compiler: Compiler): void {
        const path = this.getImportString();
        compiler.importForeignFile(path);
    }
}

export abstract class FunctionStatement extends Statement {
    
    abstract createFunctionHelper(): void;
    
    createFunction(): void {
        this.tryOperation(() => {
            this.createFunctionHelper();
        });
    }
}

export class FunctionDefinitionStatement extends FunctionStatement {
    
    createFunctionHelper(): void {
        const identifierBehavior = this.createIdentifierBehavior();
        let definitionConstructor: FunctionDefinitionConstructor;
        if (this.modifiers.includes("INLINE")) {
            definitionConstructor = InlineFunctionDefinition;
        } else {
            definitionConstructor = NonInlineFunctionDefinition;
        }
        const definition = new definitionConstructor(
            this.getPos(),
            identifierBehavior,
            this.block.get(),
        );
        this.getRootBlock().addDefinition(definition);
    }
}

export class InitFunctionStatement extends FunctionStatement {
    
    createFunctionHelper(): void {
        const slot = this.getRootBlock().initFunctionBlock;
        if (slot.get() !== null) {
            throw this.createError("Expected exactly one INIT_FUNC statement.");
        }
        slot.set(this.block.get());
    }
}

export abstract class SimpleDefinitionStatement<T extends SingleTypeDefinition> extends Statement {
    type: SimpleDefinitionStatementType<T>;
    
}

export class VariableStatement<T extends VariableDefinition> extends SimpleDefinitionStatement<T> {
    
    createVariableDefinition(): {
        variableDefinition: NodeSlot<T>,
        statements: Statement[],
    } {
        const constructor = this.type.definitionConstructor;
        const identifierBehavior = this.createIdentifierBehavior();
        const typeExpression = this.args[1].get();
        const definition = new constructor(this.getPos(), identifierBehavior, typeExpression);
        let statements: Statement[] = [];
        if (this.args.length > 2) {
            const generator = this.createStatementGenerator(statements);
            generator.createInitStatement(identifierBehavior.identifier, this.args[2].get());
        }
        const slot = this.getParentBlock().addDefinition(definition);
        return { variableDefinition: slot, statements };
    }
}

export class FieldStatement<T extends FieldDefinition> extends SimpleDefinitionStatement<T> {
    
    createFieldDefinition(): T {
        const constructor = this.type.definitionConstructor;
        const identifierBehavior = this.createIdentifierBehavior();
        const typeExpression = this.args[1].get();
        return new constructor(this.getPos(), identifierBehavior, typeExpression);
    }
}

export class FieldsTypeStatement<T extends FieldsTypeDefinition = FieldsTypeDefinition> extends Statement {
    type: FieldsTypeStatementType<T>;
    
    createDefinition(): void {
        const constructor = this.type.definitionConstructor;
        const identifierBehavior = this.createIdentifierBehavior();
        const fieldDefinitions = this.block.get().extractFieldDefinitions();
        const structDefinition = new constructor(
            this.getPos(),
            identifierBehavior,
            fieldDefinitions,
        );
        this.getParentBlock().addDefinition(structDefinition);
    }
}

export class ExpressionStatement extends Statement {
    
    getExpression(): Expression {
        return this.args[0].get();
    }
    
    convertToUnixC(): string {
        return this.getExpression().convertToUnixC() + ";";
    }
}

export class LabelStatement extends Statement {
    
    convertToUnixC(): string {
        const identifier = this.getIdentifier();
        return identifier.getCodeString() + ":";
    }
}

export class JumpStatement extends Statement {
    
    convertToUnixC(): string {
        const identifier = this.getIdentifier();
        return `goto ${identifier.getCodeString()};`;
    }
}

export class JumpIfStatement extends Statement {
    
    getConditionExpression(): Expression {
        return this.args[1].get();
    }
    
    convertToUnixC(): string {
        const identifier = this.getIdentifier();
        const conditionExpression = this.getConditionExpression();
        return `if (${conditionExpression.convertToUnixC()}) goto ${identifier.getCodeString()};`;
    }
}

export class ScopeStatement extends Statement {
    
    convertToUnixC(): string {
        return `{\n${this.block.get().convertToUnixC()}\n}\n`;
    }
}

constructors.Statement = Statement;


