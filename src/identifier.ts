
import { Displayable } from "./interfaces.js";
import { CompilerError } from "./compilerError.js";

let nextIdentifierNumber = 0;

export abstract class Identifier implements Displayable {
    key: string;
    
    abstract getCodeString(): string;
    
    abstract getDisplayString(): string;
    
    abstract equals(identifier: Identifier): boolean;
    
    getForeignCodeString(): string {
        throw new CompilerError(`Cannot use ${this.getDisplayString()} as a foreign identifier.`);
    }
    
    getFieldNameString(): string {
        throw new CompilerError(`Cannot use ${this.getDisplayString()} as a field name.`);
    }
}

export class NameIdentifier extends Identifier {
    name: string;
    
    constructor(name: string) {
        super();
        this.name = name;
        this.key = `name,${this.name}`;
    }
    
    getCodeString(): string {
        return "nameIdentifier_" + this.name;
    }
    
    getForeignCodeString(): string {
        return this.name;
    }
    
    getFieldNameString(): string {
        return this.name;
    }
    
    getDisplayString(): string {
        return this.name;
    }
    
    equals(identifier: Identifier): boolean {
        if (!(identifier instanceof NameIdentifier)) {
            return false;
        }
        return (this.name === identifier.name);
    }
}

export class NumberIdentifier extends Identifier {
    value: number;
    
    constructor() {
        super();
        this.value = nextIdentifierNumber;
        nextIdentifierNumber += 1;
        this.key = `number,${this.value}`;
    }
    
    getCodeString(): string {
        return "numberIdentifier_" + this.value;
    }
    
    getDisplayString(): string {
        return "#" + this.value;
    }
    
    equals(identifier: Identifier): boolean {
        if (!(identifier instanceof NumberIdentifier)) {
            return false;
        }
        return (this.value === identifier.value);
    }
}

export class IdentifierMap<T> {
    map: { [key: string]: T };
    identifiers: Identifier[];
    
    constructor() {
        this.map = {};
        this.identifiers = [];
    }
    
    get(identifier: Identifier): T {
        const { key } = identifier;
        if (key in this.map) {
            return this.map[key];
        } else {
            return null;
        }
    }
    
    add(identifier: Identifier, value: T): void {
        const { key } = identifier;
        if (key in this.map) {
            throw new CompilerError("Duplicate identifier.");
        }
        this.map[key] = value;
        this.identifiers.push(identifier);
    }
    
    remove(identifier: Identifier): void {
        const { key } = identifier;
        if (!(key in this.map)) {
            throw new CompilerError("Missing identifier.");
        }
        delete this.map[key];
        const index = this.identifiers.findIndex((identifer2) => (
            identifier.equals(identifer2)
        ));
        this.identifiers.splice(index, 1);
    }
    
    iterate(handle: (identifier, value: T) => void): void {
        for (const identifier of this.identifiers) {
            const { key } = identifier;
            handle(identifier, this.map[key]);
        }
    }
    
    getAll(): T[] {
        const output: T[] = [];
        this.iterate((value) => {
            output.push(value);
        });
        return output;
    }
    
    getSize(): number {
        return this.identifiers.length;
    }
}

export class DisplayableIdentifierMap<T extends Displayable> extends IdentifierMap<T> implements Displayable {
    
    getDisplayString(): string {
        const lines: string[] = [];
        this.iterate((identifier, value) => {
            lines.push(`${identifier.getDisplayString()}: ${value.getDisplayString()}`);
        });
        return lines.join("\n");
    }
}


