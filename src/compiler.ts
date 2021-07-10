
import * as fs from "fs";
import * as pathUtils from "path";
import { Config } from "./interfaces.js";
import * as parseUtils from "./parseUtils.js";
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
        lines.forEach((line) => {
            const statement = parseUtils.parseLine(line);
            if (statement !== null) {
                this.statements.push(statement);
            }
        });
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


