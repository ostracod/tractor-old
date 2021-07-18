
import * as fs from "fs";
import * as pathUtils from "path";
import { Config } from "./interfaces.js";
import CompilerError from "./compilerError.js";
import TractorFile from "./tractorFile.js";

export default class Compiler {
    projectPath: string;
    config: Config;
    
    constructor(projectPath: string) {
        this.projectPath = projectPath;
    }
    
    readConfig() {
        const path = pathUtils.join(this.projectPath, "tractorConfig.json");
        this.config = JSON.parse(fs.readFileSync(path, "utf8"));
    }
    
    importTractorFile(path) {
        const tractorFile = new TractorFile(path);
        console.log(tractorFile.toString());
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


