
import * as fs from "fs";
import * as pathUtils from "path";
import { Config } from "./interfaces.js";
import CompilerError from "./compilerError.js";
import TractorFile from "./tractorFile.js";
import Statement from "./statement.js";

export default class Compiler {
    projectPath: string;
    srcPath: string;
    config: Config;
    statements: Statement[];
    importedPaths: Set<string>;
    
    constructor(projectPath: string) {
        this.projectPath = projectPath;
        this.srcPath = pathUtils.join(this.projectPath, "src");
    }
    
    readConfig() {
        const path = pathUtils.join(this.projectPath, "tractorConfig.json");
        this.config = JSON.parse(fs.readFileSync(path, "utf8"));
    }
    
    importTractorFile(path) {
        const absolutePath = pathUtils.resolve(this.srcPath, path);
        if (this.importedPaths.has(absolutePath)) {
            return;
        }
        this.importedPaths.add(absolutePath);
        const tractorFile = new TractorFile(absolutePath);
        const { statements } = tractorFile;
        const importStatements = [];
        statements.forEach((statement) => {
            const directive = statement.getDirective();
            if (directive === "IMPORT") {
                importStatements.push(statement);
            } else {
                this.statements.push(statement);
            }
        });
        importStatements.forEach((statement) => {
            try {
                const path = statement.args[0].evaluateToString();
                this.importTractorFile(path);
            } catch (error) {
                if (error instanceof CompilerError) {
                    error.setPosIfMissing(statement.pos);
                }
                throw error;
            }
        });
    }
    
    compile(): void {
        this.statements = [];
        this.importedPaths = new Set();
        try {
            console.log("Reading config...");
            this.readConfig();
            console.log("Reading source files...");
            this.importTractorFile("./main.trtr");
            // TODO: Finish this method.
            const textList = this.statements.map((statement) => statement.toString());
            console.log(textList.join("\n"));
        } catch (error) {
            if (error instanceof CompilerError) {
                console.log(error.toString());
            } else {
                throw error;
            }
        }
    }
}


