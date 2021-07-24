
import * as niceUtils from "./niceUtils.js";
import { Displayable } from "./interfaces.js";
import { Pos } from "./pos.js";
import { CompilerError } from "./compilerError.js";
import { StatementType } from "./statementType.js";
import { Compiler } from "./compiler.js";
import { Expression } from "./expression.js";
import { FunctionDefinition, NamedFunctionDefinition, InitFunctionDefinition } from "./functionDefinition.js";

export class Statement implements Displayable {
    type: StatementType;
    modifiers: string[];
    args: Expression[];
    pos: Pos;
    nestedStatements: Statement[];
    
    constructor(type: StatementType, modifiers: string[], args: Expression[]) {
        this.type = type;
        this.modifiers = modifiers;
        this.args = args;
        this.pos = null;
        this.nestedStatements = [];
        this.type.validateModifiers(this.modifiers);
        this.type.validateArgCount(this.args.length);
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
    
    getDisplayString(indentationLevel = 0): string {
        const indentation = niceUtils.getIndentation(indentationLevel);
        const textList = this.modifiers.slice();
        const { directive } = this.type;
        if (directive !== null) {
            textList.push(directive);
        }
        if (this.args.length > 0) {
            const argsText = this.args.map((arg) => arg.getDisplayString()).join(", ");
            textList.push(argsText);
        }
        const lines = [indentation + textList.join(" ")];
        this.nestedStatements.forEach((statement) => {
            lines.push(statement.getDisplayString(indentationLevel + 1));
        });
        return lines.join("\n");
    }
}

export abstract class ImportStatement extends Statement {
    
    abstract importFilesHelper(): void;
    
    importFiles(): void {
        try {
            this.importFilesHelper();
        } catch (error) {
            if (error instanceof CompilerError) {
                error.setPosIfMissing(this.pos);
            }
            throw error;
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

export class NamedFunctionStatement extends FunctionStatement {
    
    createFunctionDefinition(): void {
        const name = this.args[0].evaluateToIdentifierName();
        const definition = new NamedFunctionDefinition(name, this.nestedStatements);
        this.getCompiler().namedFunctionDefinitions.push(definition);
    }
}

export class InitFunctionStatement extends FunctionStatement {
    
    createFunctionDefinition(): void {
        const compiler = this.getCompiler();
        if (compiler.initFunctionDefinition !== null) {
            throw this.createError("Expected exactly one INIT_FUNC statement.");
        }
        const definition = new InitFunctionDefinition(this.nestedStatements);
        compiler.initFunctionDefinition = definition;
    }
}


