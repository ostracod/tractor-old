
import * as fs from "fs";
import * as parseUtils from "./parseUtils.js";
import { Displayable } from "./interfaces.js";
import { Pos } from "./pos.js";
import { CompilerError } from "./compilerError.js";
import { Compiler } from "./compiler.js";
import { Token } from "./token.js";
import { TokenLine } from "./tokenLine.js";
import { Statement } from "./statement.js";

export class SourceFile implements Displayable {
    compiler: Compiler;
    path: string;
    lines: string[];
    
    constructor(compiler: Compiler, path: string) {
        this.compiler = compiler;
        this.path = path;
        if (!fs.existsSync(this.path)) {
            throw new CompilerError(`Could not find source file at "${this.path}".`);
        }
        this.lines = fs.readFileSync(this.path, "utf8").split("\n");
    }
    
    getDisplayString(): string {
        return this.lines.join("\n");
    }
}

export class TractorFile extends SourceFile {
    tokenLines: TokenLine[];
    statements: Statement[];
    
    constructor(compiler: Compiler, path: string) {
        super(compiler, path);
        this.parseLines();
        this.parseTokens();
        this.collapseBlocks();
    }
    
    parseLines(): void {
        this.tokenLines = [];
        this.lines.forEach((line, index) => {
            const pos = new Pos(this, index + 1);
            let tokens: Token[];
            try {
                tokens = parseUtils.parseLine(line);
            } catch (error) {
                if (error instanceof CompilerError) {
                    error.pos = pos;
                }
                throw error;
            }
            if (tokens.length > 0) {
                const tokenLine = new TokenLine(tokens, pos);
                this.tokenLines.push(tokenLine);
            }
        });
    }
    
    parseTokens(): void {
        this.statements = this.tokenLines.map((tokenLine) => {
            const { pos } = tokenLine;
            let statement: Statement;
            try {
                statement = parseUtils.parseTokens(tokenLine.tokens);
            } catch (error) {
                if (error instanceof CompilerError) {
                    error.pos = pos;
                }
                throw error;
            }
            statement.setPos(pos);
            return statement;
        });
    }
    
    collapseBlocks(): void {
        const rootStatements = [];
        const statementsStack: Statement[][] = [rootStatements];
        this.statements.forEach((statement) => {
            const statementType = statement.type;
            if (statementType.isBlockEnd) {
                statementsStack.pop();
                if (statementsStack.length <= 0) {
                    throw statement.createError(
                        `Unexpected "${statementType.directive}" statement.`,
                    );
                }
                if (!statementType.isBlockStart) {
                    return;
                }
            }
            const lastStatements = statementsStack[statementsStack.length - 1];
            lastStatements.push(statement);
            if (statementType.isBlockStart) {
                statementsStack.push(statement.nestedStatements);
            }
        });
        this.statements = rootStatements;
    }
    
    getDisplayString(): string {
        const textList = this.statements.map((statement) => statement.getDisplayString());
        return textList.join("\n");
    }
}


