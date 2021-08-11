
import * as niceUtils from "./niceUtils.js";
import { Node, NodeSlot } from "./node.js";
import { StatementType } from "./statementType.js";
import { StatementBlock } from "./statementBlock.js";
import { Expression } from "./expression.js";
import { FunctionDefinition, IdentifierFunctionDefinitionConstructor, NonInlineFunctionDefinition, InlineFunctionDefinition, InitFunctionDefinition } from "./functionDefinition.js";

export type StatementConstructor = new (
    type: StatementType,
    modifiers: string[],
    args: Expression[],
) => Statement;

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
    
    // TODO: SCOPE, STRUCT, and UNION statements should also
    // expand inline functions in nested block.
    expandInlineFunctions(): Statement[] {
        const statements = [];
        this.processExpressions((expression) => {
            const result = expression.expandInlineFunctions();
            if (result === null) {
                return null;
            }
            niceUtils.extendList(statements, result.statements);
            return result.expression;
        });
        if (statements.length <= 0) {
            return null;
        }
        statements.push(this);
        const block = this.createStatementBlock(statements);
        const generator = this.createStatementGenerator();
        const scopeStatement = generator.createScopeStatement(block);
        return [scopeStatement];
    }
    
    getDisplayString(indentationLevel = 0): string {
        const indentation = niceUtils.getIndentation(indentationLevel);
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
        const line = indentation + textList.join(" ");
        textList = [line];
        const nestedBlock = this.block.get();
        if (nestedBlock !== null) {
            textList.push(nestedBlock.getDisplayString(indentationLevel + 1));
        }
        return textList.join("\n");
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

export abstract class FunctionStatement extends Statement {
    
    abstract createFunctionDefinitionHelper(): NodeSlot<FunctionDefinition>;
    
    createFunctionDefinition(): void {
        this.tryOperation(() => {
            const slot = this.createFunctionDefinitionHelper();
            this.getCompiler().functionDefinitions.push(slot);
        });
    }
}

export class IdentifierFunctionStatement extends FunctionStatement {
    
    createFunctionDefinitionHelper(): NodeSlot<FunctionDefinition> {
        const identifier = this.args[0].get().evaluateToIdentifier();
        let definitionConstructor: IdentifierFunctionDefinitionConstructor;
        if (this.modifiers.includes("INLINE")) {
            definitionConstructor = InlineFunctionDefinition;
        } else {
            definitionConstructor = NonInlineFunctionDefinition;
        }
        const definition = new definitionConstructor(identifier, this.block.get());
        const rootBlock = this.getCompiler().rootBlock.get();
        const slot = rootBlock.addIdentifierDefinition(definition);
        return slot;
    }
}

export class InitFunctionStatement extends FunctionStatement {
    
    createFunctionDefinitionHelper(): NodeSlot<FunctionDefinition> {
        const definition = new InitFunctionDefinition(this.block.get());
        const rootBlock = this.getCompiler().rootBlock.get();
        const slot = rootBlock.initFunctionDefinition;
        if (slot.get() !== null) {
            throw this.createError("Expected exactly one INIT_FUNC statement.");
        }
        slot.set(definition);
        return slot;
    }
}


