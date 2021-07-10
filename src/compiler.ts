
import * as fs from "fs";
import * as pathUtils from "path";
import { Config } from "./interfaces.js";
import * as parseUtils from "./parseUtils.js";
import { Token } from "./token.js";
import { Statement } from "./statement.js";

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
        const tokensList: Token[][] = [];
        lines.forEach((line) => {
            const tokens = parseUtils.parseLine(line);
            if (tokens.length > 0) {
                tokensList.push(tokens);
            }
        });
        this.statements = tokensList.map(parseUtils.parseTokens);
    }
    
    compile(): void {
        console.log("Reading config...");
        this.readConfig();
        console.log("Reading source files...");
        const path = pathUtils.join(this.projectPath, "src", "main.trtr");
        this.importTractorFile(path);
        // TODO: Finish this method.
        
    }
}


