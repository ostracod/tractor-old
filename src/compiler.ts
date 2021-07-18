
import * as fs from "fs";
import * as pathUtils from "path";
import { Config } from "./interfaces.js";
import * as parseUtils from "./parseUtils.js";
import Pos from "./pos.js";
import CompilerError from "./compilerError.js";
import { Token } from "./token.js";
import TokenLine from "./tokenLine.js";
import Statement from "./statement.js";

export default class Compiler {
    projectPath: string;
    statements: Statement[];
    config: Config;
    
    constructor(projectPath: string) {
        this.projectPath = projectPath;
        this.statements = [];
    }
    
    readConfig() {
        const path = pathUtils.join(this.projectPath, "tractorConfig.json");
        this.config = JSON.parse(fs.readFileSync(path, "utf8"));
    }
    
    importTractorFile(path) {
        const lines = fs.readFileSync(path, "utf8").split("\n");
        const tokenLines: TokenLine[] = [];
        lines.forEach((line, index) => {
            const pos = new Pos(path, index + 1);
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
                tokenLines.push(tokenLine);
            }
        });
        this.statements = tokenLines.map((tokenLine) => {
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
            console.log(statement.toString());
            return statement;
        });
    }
    
    compile(): void {
        try {
            console.log("Reading config...");
            this.readConfig();
            console.log("Reading source files...");
            const path = pathUtils.join(this.projectPath, "src", "main.trtr");
            this.importTractorFile(path);
            // TODO: Finish this method.
            
        } catch (error) {
            if (error instanceof CompilerError) {
                console.log(error.toString());
            } else {
                throw error;
            }
        }
    }
}


