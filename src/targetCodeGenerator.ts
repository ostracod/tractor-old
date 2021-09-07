
import * as fs from "fs";
import * as pathUtils from "path";
import { Compiler } from "./compiler.js";

export type TargetCodeGeneratorConstructor = new (compiler: Compiler) => TargetCodeGenerator;

export abstract class TargetCodeGenerator {
    compiler: Compiler;
    
    constructor(compiler: Compiler) {
        this.compiler = compiler;
    }
    
    getForeignCode(): string {
        const codeList = this.compiler.foreignFiles.map((sourceFile) => (
            sourceFile.lines.join("\n")
        ));
        return codeList.join("\n");
    }
    
    abstract generateCode(): void;
}

class UnixCGenerator extends TargetCodeGenerator {
    
    generateCode(): void {
        const { projectPath, buildFileName } = this.compiler;
        const buildDirectoryPath = pathUtils.join(projectPath, "build");
        if (!fs.existsSync(buildDirectoryPath)) {
            fs.mkdirSync(buildDirectoryPath);
        }
        const buildFilePath = pathUtils.join(buildDirectoryPath, buildFileName);
        const rootBlock = this.compiler.rootBlock.get();
        const codeList: string[] = [
            "#include <stdint.h>",
            this.getForeignCode(),
            rootBlock.convertToUnixC(),
        ];
        fs.writeFileSync(buildFilePath, codeList.join("\n") + "\n");
    }
}

export const codeGeneratorConstructorMap: {
    [targetLanguage: string]: TargetCodeGeneratorConstructor
} = {
    unixC: UnixCGenerator,
};


