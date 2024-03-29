
import * as fs from "fs";
import * as pathUtils from "path";
import { Config } from "./interfaces.js";
import { constructors } from "./constructors.js";
import { CompilerError } from "./compilerError.js";
import { Node, NodeSlot } from "./node.js";
import { SourceFile, TractorFile } from "./parse/sourceFile.js";
import { Expression } from "./statement/expression.js";
import { ImportStatement, FunctionStatement } from "./statement/statement.js";
import { StatementBlock, RootStatementBlock } from "./statement/statementBlock.js";
import { StatementPancake } from "./statement/statementPancake.js";
import { InlineFunctionDefinition } from "./definition/functionDefinition.js";
import { TypeResolver } from "./typeResolver.js";
import { targetLanguageMap, TargetLanguage } from "./targetLanguage.js";

export class Compiler extends Node {
    projectPath: string;
    srcPath: string;
    configNames: string[];
    configImportMap: { [name: string]: string };
    targetLanguage: TargetLanguage;
    buildFileName: string;
    importedPaths: Set<string>;
    foreignFiles: SourceFile[];
    rootBlock: NodeSlot<RootStatementBlock>;
    
    constructor(projectPath: string, configNames: string[]) {
        super();
        this.projectPath = projectPath;
        this.srcPath = pathUtils.join(this.projectPath, "src");
        this.configNames = configNames;
        this.importedPaths = new Set();
        this.foreignFiles = [];
        this.rootBlock = this.addSlot();
    }
    
    readConfig(): void {
        
        const path = pathUtils.join(this.projectPath, "tractorConfig.json");
        let config = JSON.parse(fs.readFileSync(path, "utf8")) as Config;
        this.configImportMap = {};
        this.targetLanguage = null;
        this.buildFileName = null;
        
        let index = 0;
        while (true) {
            const targetLanguageName = config.targetLanguage;
            if (typeof targetLanguageName !== "undefined") {
                const targetLanguage = targetLanguageMap[targetLanguageName];
                if (typeof targetLanguage === "undefined") {
                    throw new CompilerError(`Unknown target language "${targetLanguageName}".`);
                }
                this.targetLanguage = targetLanguage;
            }
            const { importMap, buildFileName, configs } = config;
            if (typeof importMap !== "undefined") {
                for (const name in importMap) {
                    this.configImportMap[name] = importMap[name];
                }
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
        const importStatements: ImportStatement[] = [];
        statements.forEach((statement) => {
            if (statement instanceof ImportStatement) {
                importStatements.push(statement);
            } else {
                this.rootBlock.get().addStatement(statement);
            }
        });
        importStatements.forEach((statement) => {
            statement.importFiles(this);
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
    
    extractFunctions(): void {
        const rootBlock = this.rootBlock.get();
        rootBlock.processBlockStatements((statement) => {
            if (statement instanceof FunctionStatement) {
                statement.createFunction();
                return [];
            }
            return [statement];
        });
        if (rootBlock.initFunctionBlock.get() === null) {
            throw new CompilerError("Missing INIT_FUNC statement.");
        }
    }
    
    processExpandedNodes<T extends Node>(
        constructor: Function & { prototype: T },
        handle: (node: T) => T,
    ): number {
        return this.processNodes((node) => {
            if (node instanceof InlineFunctionDefinition) {
                return node;
            }
            if (node instanceof constructor) {
                return handle(node as T);
            } else {
                return null;
            }
        });
    }
    
    iterateOverExpandedBlocks(handle: (block: StatementBlock) => number): number {
        let output = 0;
        this.processExpandedNodes(StatementBlock, (block) => {
            output += handle(block);
            return null;
        });
        return output;
    }
    
    extractVariableDefinitions(): number {
        return this.iterateOverExpandedBlocks((block) => (
            block.extractVariableDefinitions()
        ));
    }
    
    extractTypeDefinitions(): number {
        return this.iterateOverExpandedBlocks((block) => (
            block.extractTypeDefinitions()
        ));
    }
    
    transformControlFlow(): number {
        return this.iterateOverExpandedBlocks((block) => (
            block.transformControlFlow()
        ));
    }
    
    resolveCompKnowns(): number {
        return this.processExpandedNodes(
            Expression,
            (expression) => expression.resolveCompKnowns(),
        );
    }
    
    // This function must be called after extractTypeDefinitions and
    // transformControlFlow, but before expandInlineFunctions.
    processStatementPancakes(): number {
        return this.iterateOverExpandedBlocks((block) => {
            if (!block.isPancakeBase()) {
                return 0;
            }
            const pancake = new StatementPancake(block);
            pancake.determineReachability();
            pancake.markUnreachableAsUseless();
            pancake.markUselessJumpStatements();
            pancake.resolveInitItems();
            return pancake.removeUselessStatements();
        });
    }
    
    removeEmptyScopeStatements(): number {
        return this.iterateOverExpandedBlocks((block) => (
            block.removeEmptyScopeStatements()
        ));
    }
    
    resolveTypes(): number {
        let output = 0;
        this.processExpandedNodes(
            TypeResolver,
            (typeResolver) => {
                const result = typeResolver.resolveType();
                if (result) {
                    output += 1;
                }
                return null;
            },
        );
        return output;
    }
    
    expandInlineFunctions(): number {
        return this.iterateOverExpandedBlocks((block) => (
            block.processBlockStatements((statement) => statement.expandInlineFunctions())
        ));
    }
    
    getDisplayString(): string {
        return this.rootBlock.get().getDisplayString();
    }
    
    compile(): void {
        try {
            console.log("Reading config...");
            this.readConfig();
            this.rootBlock.set(new RootStatementBlock());
            console.log("Reading source files...");
            this.importTractorFile("./main.trtr");
            this.extractFunctions();
            console.log("Processing definitions...");
            while (true) {
                let processCount = 0;
                processCount += this.extractTypeDefinitions();
                processCount += this.extractVariableDefinitions();
                processCount += this.transformControlFlow();
                processCount += this.resolveCompKnowns();
                processCount += this.processStatementPancakes();
                processCount += this.removeEmptyScopeStatements();
                processCount += this.resolveTypes();
                processCount += this.expandInlineFunctions();
                if (processCount <= 0) {
                    break;
                }
            }
            console.log(`\n${this.getDisplayString()}\n`);
            console.log("Generating target code...");
            const generatorConstructor = this.targetLanguage.codeGeneratorConstructor;
            const codeGenerator = new generatorConstructor(this);
            codeGenerator.generateCode();
            console.log("Finished.");
        } catch (error) {
            if (error instanceof CompilerError) {
                console.log(error.getDisplayString());
            } else {
                throw error;
            }
        }
    }
}

constructors.Compiler = Compiler;


