
import * as fs from "fs";
import * as pathUtils from "path";
import { Config } from "./interfaces.js";
import { CompilerError } from "./compilerError.js";
import { SourceFile, TractorFile } from "./sourceFile.js";
import { Statement, ImportStatement, FunctionStatement } from "./statement.js";
import { NamedFunctionDefinition, InitFunctionDefinition } from "./functionDefinition.js";

export class Compiler {
    projectPath: string;
    srcPath: string;
    configNames: string[];
    configImportMap: { [name: string]: string };
    targetLanguage: string;
    buildFileName: string;
    rootStatements: Statement[];
    importedPaths: Set<string>;
    foreignFiles: SourceFile[];
    namedFunctionDefinitions: NamedFunctionDefinition[];
    initFunctionDefinition: InitFunctionDefinition;
    
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
        const tractorFile = new TractorFile(this, absolutePath);
        const { statements } = tractorFile;
        const importStatements: ImportStatement[] = [];
        statements.forEach((statement) => {
            if (statement instanceof ImportStatement) {
                importStatements.push(statement);
            } else {
                this.rootStatements.push(statement);
            }
        });
        importStatements.forEach((statement) => {
            try {
                statement.importFiles();
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
        const foreignFile = new SourceFile(this, absolutePath);
        this.foreignFiles.push(foreignFile);
    }
    
    extractFunctionDefinitions(): void {
        this.rootStatements = this.rootStatements.filter((statement) => {
            if (statement instanceof FunctionStatement) {
                statement.createFunctionDefinition();
                return false;
            }
            return true;
        });
        if (this.initFunctionDefinition === null) {
            throw new CompilerError("Missing INIT_FUNC statement.");
        }
    }
    
    compile(): void {
        this.rootStatements = [];
        this.importedPaths = new Set();
        this.foreignFiles = [];
        this.namedFunctionDefinitions = [];
        this.initFunctionDefinition = null;
        try {
            console.log("Reading config...");
            this.readConfig();
            console.log("Reading source files...");
            this.importTractorFile("./main.trtr");
            this.extractFunctionDefinitions();
            // TODO: Finish this method.
            console.log("\n= = = Root Lines = = =\n");
            console.log(this.rootStatements.map(
                (statement) => statement.toString()
            ).join("\n"));
            console.log("\n= = = Function Definitions = = =\n");
            console.log(this.namedFunctionDefinitions.map(
                (definition) => definition.toString()
            ).join("\n"));
            console.log(this.initFunctionDefinition.toString());
        } catch (error) {
            if (error instanceof CompilerError) {
                console.log(error.toString());
            } else {
                throw error;
            }
        }
    }
}


