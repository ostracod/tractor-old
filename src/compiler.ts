
import * as fs from "fs";
import * as pathUtils from "path";
import { Config } from "./interfaces.js";
import CompilerError from "./compilerError.js";
import { SourceFile, TractorFile } from "./sourceFile.js";
import { ImportStatementType } from "./statementType.js";
import Statement from "./statement.js";

export default class Compiler {
    projectPath: string;
    srcPath: string;
    configNames: string[];
    configImportMap: { [name: string]: string };
    targetLanguage: string;
    buildFileName: string;
    statements: Statement[];
    importedPaths: Set<string>;
    foreignFiles: SourceFile[];
    
    constructor(projectPath: string, configNames: string[]) {
        this.projectPath = projectPath;
        this.srcPath = pathUtils.join(this.projectPath, "src");
        this.configNames = configNames;
    }
    
    readConfig(): void {
        const path = pathUtils.join(this.projectPath, "tractorConfig.json");
        let config = JSON.parse(fs.readFileSync(path, "utf8")) as Config;
        this.configImportMap = {};
        this.targetLanguage = null;
        this.buildFileName = null;
        let index = 0;
        while (true) {
            const { importMap, targetLanguage, buildFileName, configs } = config;
            if (typeof importMap !== "undefined") {
                for (const name in importMap) {
                    this.configImportMap[name] = importMap[name];
                }
            }
            if (typeof targetLanguage !== "undefined") {
                this.targetLanguage = targetLanguage;
            }
            if (typeof buildFileName !== "undefined") {
                this.buildFileName = buildFileName;
            }
            if (typeof configs === "undefined") {
                break;
            }
            let nextConfig: Config;
            if (index < this.configNames.length) {
                const name = this.configNames[index];
                index += 1;
                nextConfig = configs.find((config) => (config.name === name));
                if (typeof nextConfig === "undefined") {
                    throw new CompilerError(`Config "${config.name}" has no nested config "${name}".`);
                }
            } else {
                nextConfig = configs.find((config) => (
                    "isDefault" in config && config.isDefault
                ));
                if (typeof nextConfig === "undefined") {
                    throw new CompilerError(`Config "${config.name}" has no default nested config.`);
                }
            }
            config = nextConfig;
        }
        if (index < this.configNames.length) {
            throw new CompilerError(`Config "${config.name}" has no nested configs.`);
        }
        if (this.targetLanguage === null) {
            throw new CompilerError("Missing targetLanguage in config.");
        }
        if (this.buildFileName === null) {
            throw new CompilerError("Missing buildFileName in config.");
        }
    }
    
    registerImportedFile(path: string): string {
        const absolutePath = pathUtils.resolve(this.srcPath, path);
        if (this.importedPaths.has(absolutePath)) {
            return null;
        }
        this.importedPaths.add(absolutePath);
        return absolutePath;
    }
    
    importTractorFile(path: string): void {
        const absolutePath = this.registerImportedFile(path);
        if (absolutePath === null) {
            return;
        }
        const tractorFile = new TractorFile(absolutePath);
        const { statements } = tractorFile;
        const importStatements: Statement<ImportStatementType>[] = [];
        statements.forEach((statement) => {
            if (statement.type instanceof ImportStatementType) {
                importStatements.push(statement as Statement<ImportStatementType>);
            } else {
                this.statements.push(statement);
            }
        });
        importStatements.forEach((statement) => {
            try {
                const importStatementType = statement.type;
                importStatementType.importFiles(statement.args, this);
            } catch (error) {
                if (error instanceof CompilerError) {
                    error.setPosIfMissing(statement.pos);
                }
                throw error;
            }
        });
    }
    
    importForeignFile(path: string): void {
        const absolutePath = this.registerImportedFile(path);
        if (absolutePath === null) {
            return;
        }
        const foreignFile = new SourceFile(absolutePath);
        this.foreignFiles.push(foreignFile);
    }
    
    compile(): void {
        this.statements = [];
        this.importedPaths = new Set();
        this.foreignFiles = [];
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


