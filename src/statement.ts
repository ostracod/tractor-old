
import * as niceUtils from "./niceUtils.js";
import { constructors } from "./constructors.js";
import { Node, NodeSlot, processNodeList } from "./node.js";
import { StatementType, SimpleDefinitionStatementType, FieldsTypeStatementType } from "./statementType.js";
import { StatementBlock } from "./statementBlock.js";
import { Expression, IdentifierExpression } from "./expression.js";
import { Identifier, NumberIdentifier, IdentifierMap } from "./identifier.js";
import { FunctionDefinition, IdentifierFunctionDefinitionConstructor, IdentifierFunctionDefinition, NonInlineFunctionDefinition, InlineFunctionDefinition, InitFunctionDefinition } from "./functionDefinition.js";
import { VariableDefinition, ArgVariableDefinition } from "./variableDefinition.js";
import { SingleTypeDefinition, FieldDefinition, DataFieldDefinition, FieldsTypeDefinition } from "./typeDefinition.js";

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
    
    getDeclarationIdentifierSlot(): NodeSlot<Expression> {
        const { hasDeclarationIdentifier } = this.type;
        if (!hasDeclarationIdentifier) {
            return null;
        }
        return this.args[0];
    }
    
    getDeclarationIdentifier(): Identifier {
        const identifierExpression = this.getDeclarationIdentifierSlot().get();
        return identifierExpression.evaluateToIdentifier();
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
    
    abstract importFilesHelper(): void;
    
    importFiles(): void {
        this.tryOperation(() => {
            this.importFilesHelper();
        });
    }
}

export class PathImportStatement extends ImportStatement {
    
    importFilesHelper(): void {
        const path = this.args[0].get().evaluateToString();
        this.getCompiler().importTractorFile(path);
    }
}

export class ConfigImportStatement extends ImportStatement {
    
    importFilesHelper(): void {
        const name = this.args[0].get().evaluateToString();
        const compiler = this.getCompiler();
        const path = compiler.configImportMap[name];
        compiler.importTractorFile(path);
    }
}

export class ForeignImportStatement extends ImportStatement {
    
    importFilesHelper(): void {
        const path = this.args[0].get().evaluateToString();
        this.getCompiler().importForeignFile(path);
    }
}

export abstract class FunctionStatement<T extends FunctionDefinition> extends Statement {
    
    abstract createFunctionDefinitionHelper(): void;
    
    createFunctionDefinition(): void {
        this.tryOperation(() => {
            this.createFunctionDefinitionHelper();
        });
    }
}

export class IdentifierFunctionStatement extends FunctionStatement<IdentifierFunctionDefinition> {
    
    createFunctionDefinitionHelper(): void {
        const identifier = this.getDeclarationIdentifier();
        let definitionConstructor: IdentifierFunctionDefinitionConstructor;
        if (this.modifiers.includes("INLINE")) {
            definitionConstructor = InlineFunctionDefinition;
        } else {
            definitionConstructor = NonInlineFunctionDefinition;
        }
        const definition = new definitionConstructor(
            this.getPos(),
            identifier,
            this.block.get(),
        );
        const rootBlock = this.getCompiler().rootBlock.get();
        rootBlock.addIdentifierDefinition(definition);
    }
}

export class InitFunctionStatement extends FunctionStatement<InitFunctionDefinition> {
    
    createFunctionDefinitionHelper(): void {
        const definition = new InitFunctionDefinition(this.getPos(), this.block.get());
        const rootBlock = this.getCompiler().rootBlock.get();
        const slot = rootBlock.initFunctionDefinition;
        if (slot.get() !== null) {
            throw this.createError("Expected exactly one INIT_FUNC statement.");
        }
        slot.set(definition);
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
        const identifier = this.getDeclarationIdentifier();
        const typeExpression = this.args[1].get();
        const definition = new constructor(this.getPos(), identifier, typeExpression);
        let statements: Statement[] = [];
        if (this.args.length > 2) {
            const generator = this.createStatementGenerator(statements);
            generator.createInitStatement(identifier, this.args[2].get());
        }
        const slot = this.getParentBlock().addIdentifierDefinition(definition);
        return { variableDefinition: slot, statements };
    }
}

export class FieldStatement<T extends FieldDefinition> extends SimpleDefinitionStatement<T> {
    
    createFieldDefinition(): T {
        const constructor = this.type.definitionConstructor;
        const identifier = this.getDeclarationIdentifier();
        const typeExpression = this.args[1].get();
        return new constructor(this.getPos(), identifier, typeExpression);
    }
}

export class FieldsTypeStatement<T extends FieldsTypeDefinition = FieldsTypeDefinition> extends Statement {
    type: FieldsTypeStatementType<T>;
    
    createDefinition(): void {
        const constructor = this.type.definitionConstructor;
        const identifier = this.getDeclarationIdentifier();
        const fieldDefinitions = this.block.get().extractFieldDefinitions();
        const structDefinition = new constructor(this.getPos(), identifier, fieldDefinitions);
        this.getParentBlock().addIdentifierDefinition(structDefinition);
    }
}

constructors.Statement = Statement;


