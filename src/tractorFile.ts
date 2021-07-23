
import * as fs from "fs";
import * as parseUtils from "./parseUtils.js";
import Pos from "./pos.js";
import CompilerError from "./compilerError.js";
import { Token } from "./token.js";
import TokenLine from "./tokenLine.js";
import Statement from "./statement.js";

export default class TractorFile {
    path: string;
    tokenLines: TokenLine[];
    statements: Statement[];
    
    constructor(path: string) {
        this.path = path;
        this.parseLines();
        this.parseTokens();
        this.collapseBlocks();
    }
    
    parseLines(): void {
        if (!fs.existsSync(this.path)) {
            throw new CompilerError(`Could not find source file at "${this.path}".`);
        }
        const lines = fs.readFileSync(this.path, "utf8").split("\n");
        this.tokenLines = [];
        lines.forEach((line, index) => {
            const pos = new Pos(this.path, index + 1);
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
            statement.pos = pos;
            return statement;
        });
    }
    
    collapseBlocks(): void {
        const rootStatements = [];
        const statementsStack: Statement[][] = [rootStatements];
        this.statements.forEach((statement) => {
            const { directive } = statement;
            const isBlockStart = parseUtils.directiveIsBlockStart(statement.directive);
            if (parseUtils.directiveIsBlockEnd(directive)) {
                statementsStack.pop();
                if (statementsStack.length <= 0) {
                    throw new CompilerError(
                        `Unexpected "${directive}" statement.`,
                        statement.pos,
                    );
                }
                if (!isBlockStart) {
                    return;
                }
            }
            const lastStatements = statementsStack[statementsStack.length - 1];
            lastStatements.push(statement);
            if (isBlockStart) {
                statementsStack.push(statement.nestedStatements);
            }
        });
        this.statements = rootStatements;
    }
    
    toString(): string {
        const textList = this.statements.map((statement) => statement.toString());
        return textList.join("\n");
    }
}


