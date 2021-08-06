
import * as fs from "fs";
import * as pathUtils from "path";
import { Config } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { CompilerError } from "./compilerError.js";
import { SourceFile, TractorFile } from "./sourceFile.js";
import { Statement, ImportStatement, FunctionStatement } from "./statement.js";
import { StatementBlock } from "./statementBlock.js";
import { FunctionDefinition, IdentifierFunctionDefinition, InitFunctionDefinition, InlineFunctionDefinition } from "./functionDefinition.js";

export class Compiler {
    projectPath: string;
    srcPath: string;
    configNames: string[];
    configImportMap: { [name: string]: string };
    targetLanguage: string;
    buildFileName: string;
    rootBlock: StatementBlock;
    importedPaths: Set<string>;
    foreignFiles: SourceFile[];
    functionDefinitions: FunctionDefinition[];
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
        const { statements } = tractorFile.block;
        const importStatements: ImportStatement[] = [];
        statements.forEach((statement) => {
            if (statement instanceof ImportStatement) {
                importStatements.push(statement);
            } else {
                this.rootBlock.addStatement(statement);
            }
        });
        importStatements.forEach((statement) => {
            statement.importFiles();
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
        this.rootBlock.processStatements((statement) => {
            if (statement instanceof FunctionStatement) {
                statement.createFunctionDefinition();
                return [];
            }
            return null;
        });
        if (this.initFunctionDefinition === null) {
            throw new CompilerError("Missing INIT_FUNC statement.");
        }
    }
    
    processStatementBlocks(handle: (block: StatementBlock) => void): void {
        handle(this.rootBlock);
        this.functionDefinitions.forEach((definition) => {
            if (!(definition instanceof InlineFunctionDefinition)) {
                handle(definition.block);
            }
        });
    }
    
    transformControlFlow(): void {
        this.processStatementBlocks((block) => {
            block.transformControlFlow();
        });
    }
    
    resolveCompItems(): void {
        this.processStatementBlocks((block) => {
            block.resolveCompItems();
        });
    }
    
    expandInlineFunctions(): void {
        this.processStatementBlocks((block) => {
            block.expandInlineFunctions();
        });
    }
    
    compile(): void {
        this.rootBlock = new StatementBlock();
        this.importedPaths = new Set();
        this.foreignFiles = [];
        this.functionDefinitions = [];
        this.initFunctionDefinition = null;
        try {
            console.log("Reading config...");
            this.readConfig();
            console.log("Reading source files...");
            this.importTractorFile("./main.trtr");
            this.extractFunctionDefinitions();
            this.transformControlFlow();
            this.resolveCompItems();
            this.expandInlineFunctions();
            // TODO: Finish this method.
            niceUtils.printDisplayables("Root Block", [this.rootBlock]);
            niceUtils.printDisplayables("Function Definitions", this.functionDefinitions);
        } catch (error) {
            if (error instanceof CompilerError) {
                console.log(error.getDisplayString());
            } else {
                throw error;
            }
        }
    }
}


