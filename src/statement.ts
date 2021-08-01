
import * as niceUtils from "./niceUtils.js";
import { Displayable } from "./interfaces.js";
import { Pos } from "./pos.js";
import { CompilerError } from "./compilerError.js";
import { StatementType } from "./statementType.js";
import { StatementBlock } from "./statementBlock.js";
import { StatementGenerator } from "./statementGenerator.js";
import { Compiler } from "./compiler.js";
import { Expression, processExpressionList, expandInlineFunctions } from "./expression.js";
import { FunctionDefinition, IdentifierFunctionDefinitionConstructor, NonInlineFunctionDefinition, InlineFunctionDefinition, InitFunctionDefinition } from "./functionDefinition.js";

export class Statement implements Displayable {
    type: StatementType;
    modifiers: string[];
    args: Expression[];
    pos: Pos;
    nestedBlock: StatementBlock;
    parentBlock: StatementBlock;
    
    constructor(type: StatementType, modifiers: string[], args: Expression[]) {
        this.type = type;
        this.modifiers = modifiers;
        this.args = args;
        this.pos = null;
        this.nestedBlock = null;
        this.parentBlock = null;
        this.type.validateModifiers(this.modifiers);
        this.type.validateArgCount(this.args.length);
    }
    
    setParentBlock(block: StatementBlock): void {
        this.parentBlock = block;
        if (this.nestedBlock !== null) {
            this.nestedBlock.parentBlock = block;
        }
    }
    
    clearParentBlock(): void {
        this.parentBlock = null;
        if (this.nestedBlock !== null) {
            this.nestedBlock.parentBlock = null;
        }
    }
    
    setPos(pos: Pos): void {
        this.pos = pos;
        this.args.forEach((expression) => {
            expression.setPos(this.pos);
        });
    }
    
    getCompiler(): Compiler {
        return this.pos.sourceFile.compiler;
    }
    
    createError(message: string): CompilerError {
        return new CompilerError(message, this.pos);
    }
    
    handleError(error: Error): void {
        if (error instanceof CompilerError && error.pos === null) {
            error.pos = this.pos;
        }
        throw error;
    }
    
    createStatementBlock(statements: Statement[] = []): StatementBlock {
        return new StatementBlock(this.pos, statements);
    }
    
    createStatementGenerator(block: StatementBlock = null): StatementGenerator {
        return new StatementGenerator(this.pos, block);
    }
    
    processArgs(handle: (expression: Expression) => Expression): void {
        processExpressionList(this.args, handle);
    }
    
    // TODO: SCOPE, STRUCT, and UNION statements should also
    // expand inline functions in nested block.
    expandInlineFunctions(): Statement[] {
        const statements = expandInlineFunctions((handle) => {
            this.processArgs(handle);
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
            const argsText = this.args.map((arg) => arg.getDisplayString()).join(", ");
            textList.push(argsText);
        }
        const line = indentation + textList.join(" ");
        textList = [line];
        if (this.nestedBlock !== null) {
            textList.push(this.nestedBlock.getDisplayString(indentationLevel + 1));
        }
        return textList.join("\n");
    }
}

export abstract class ImportStatement extends Statement {
    
    abstract importFilesHelper(): void;
    
    importFiles(): void {
        try {
            this.importFilesHelper();
        } catch (error) {
            this.handleError(error);
        }
    }
}

export class PathImportStatement extends ImportStatement {
    
    importFilesHelper(): void {
        const path = this.args[0].evaluateToString();
        this.getCompiler().importTractorFile(path);
    }
}

export class ConfigImportStatement extends ImportStatement {
    
    importFilesHelper(): void {
        const name = this.args[0].evaluateToString();
        const compiler = this.getCompiler();
        const path = compiler.configImportMap[name];
        compiler.importTractorFile(path);
    }
}

export class ForeignImportStatement extends ImportStatement {
    
    importFilesHelper(): void {
        const path = this.args[0].evaluateToString();
        this.getCompiler().importForeignFile(path);
    }
}

export abstract class FunctionStatement extends Statement {
    
    abstract createFunctionDefinitionHelper(): FunctionDefinition;
    
    createFunctionDefinition(): void {
        try {
            const definition = this.createFunctionDefinitionHelper();
            this.getCompiler().functionDefinitions.push(definition);
        } catch (error) {
            this.handleError(error);
        }
    }
}

export class IdentifierFunctionStatement extends FunctionStatement {
    
    createFunctionDefinitionHelper(): FunctionDefinition {
        const identifier = this.args[0].evaluateToIdentifier();
        let definitionConstructor: IdentifierFunctionDefinitionConstructor;
        if (this.modifiers.includes("INLINE")) {
            definitionConstructor = InlineFunctionDefinition;
        } else {
            definitionConstructor = NonInlineFunctionDefinition;
        }
        const definition = new definitionConstructor(identifier, this.nestedBlock);
        const identifierMap = this.getCompiler().identifierFunctionDefinitions;
        identifierMap.set(definition.identifier, definition);
        return definition;
    }
}

export class InitFunctionStatement extends FunctionStatement {
    
    createFunctionDefinitionHelper(): FunctionDefinition {
        const compiler = this.getCompiler();
        if (compiler.initFunctionDefinition !== null) {
            throw this.createError("Expected exactly one INIT_FUNC statement.");
        }
        const definition = new InitFunctionDefinition(this.nestedBlock);
        compiler.initFunctionDefinition = definition;
        return definition;
    }
}


