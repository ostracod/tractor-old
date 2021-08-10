
import * as fs from "fs";
import * as parseUtils from "./parseUtils.js";
import { Displayable } from "./interfaces.js";
import { Pos } from "./pos.js";
import { CompilerError } from "./compilerError.js";
import { Token } from "./token.js";
import { TokenLine } from "./tokenLine.js";
import { Statement } from "./statement.js";

export class SourceFile implements Displayable {
    path: string;
    lines: string[];
    
    constructor(path: string) {
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
    
    constructor(path: string) {
        super(path);
        this.parseLines();
        this.parseTokens();
    }
    
    tryOperation(pos: Pos, operation: () => void): void {
        try {
            operation();
        } catch (error) {
            if (error instanceof CompilerError && error.pos === null) {
                error.pos = pos;
            }
            throw error;
        }
    }
    
    parseLines(): void {
        this.tokenLines = [];
        this.lines.forEach((line, index) => {
            const pos = new Pos(this, index + 1);
            let tokens: Token[];
            this.tryOperation(pos, () => {
                tokens = parseUtils.parseLine(line);
            });
            if (tokens.length > 0) {
                const tokenLine = new TokenLine(tokens, pos);
                this.tokenLines.push(tokenLine);
            }
        });
    }
    
    parseTokens(): void {
        const statements = this.tokenLines.map((tokenLine) => {
            const { pos } = tokenLine;
            let statement: Statement;
            this.tryOperation(pos, () => {
                statement = parseUtils.parseTokens(tokenLine.tokens);
            });
            statement.pos = pos;
            return statement;
        });
        this.tryOperation(new Pos(this), () => {
            this.statements = parseUtils.collapseBlocks(statements);
        });
    }
    
    getDisplayString(): string {
        const lines = this.statements.map((statement) => statement.getDisplayString());
        return lines.join("\n");
    }
}


