
import { Displayable } from "./interfaces.js";
import { CompilerError } from "./compilerError.js";

let nextIdentifierNumber = 0;

export abstract class Identifier implements Displayable {
    key: string;
    
    abstract getDisplayString(): string;
    
    abstract equals(identifier: Identifier): boolean;
}

export class NameIdentifier extends Identifier {
    name: string;
    
    constructor(name: string) {
        super();
        this.name = name;
        this.key = `name,${this.name}`;
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

export class IdentifierMap<T extends Displayable> implements Displayable {
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
    
    getDisplayString(): string {
        const lines: string[] = [];
        this.iterate((identifier, value) => {
            lines.push(`${identifier.getDisplayString()}: ${value.getDisplayString()}`);
        });
        return lines.join("\n");
    }
}


