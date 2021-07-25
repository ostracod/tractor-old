
import * as niceUtils from "./niceUtils.js";
import { Displayable } from "./interfaces.js";
import { Pos } from "./pos.js";
import { CompilerError } from "./compilerError.js";
import { StatementType } from "./statementType.js";
import { StatementBlock } from "./statementBlock.js";
import { Compiler } from "./compiler.js";
import { Expression } from "./expression.js";
import { FunctionDefinition, IdentifierFunctionDefinition, InitFunctionDefinition } from "./functionDefinition.js";

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
    
    setPos(pos: Pos) {
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
    
    abstract createFunctionDefinition(): void;
}

export class IdentifierFunctionStatement extends FunctionStatement {
    
    createFunctionDefinition(): void {
        try {
            const identifier = this.args[0].evaluateToIdentifier();
            const definition = new IdentifierFunctionDefinition(identifier, this.nestedBlock);
            const identifierMap = this.getCompiler().identifierFunctionDefinitions;
            identifierMap.set(definition.identifier, definition);
        } catch (error) {
            this.handleError(error);
        }
    }
}

export class InitFunctionStatement extends FunctionStatement {
    
    createFunctionDefinition(): void {
        const compiler = this.getCompiler();
        if (compiler.initFunctionDefinition !== null) {
            throw this.createError("Expected exactly one INIT_FUNC statement.");
        }
        const definition = new InitFunctionDefinition(this.nestedBlock);
        compiler.initFunctionDefinition = definition;
    }
}


