
export default class Pos {
    path: string;
    lineNumber: number;
    
    constructor(path: string, lineNumber: number = null) {
        this.path = path;
        this.lineNumber = lineNumber;
    }
    
    getPrepositionPhrase(): string {
        if (this.lineNumber === null) {
            return `in ${this.path}`;
        }
        return `on line ${this.lineNumber} of ${this.path}`;
    }
}


