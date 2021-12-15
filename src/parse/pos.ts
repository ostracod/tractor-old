
import { SourceFile } from "./sourceFile.js";

export class Pos {
    sourceFile: SourceFile;
    lineNumber: number;
    
    constructor(sourceFile: SourceFile, lineNumber: number = null) {
        this.sourceFile = sourceFile;
        this.lineNumber = lineNumber;
    }
    
    getPrepositionPhrase(): string {
        const { path } = this.sourceFile;
        if (this.lineNumber === null) {
            return `in ${path}`;
        }
        return `on line ${this.lineNumber} of ${path}`;
    }
}


