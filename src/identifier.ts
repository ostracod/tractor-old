
import { Displayable } from "./interfaces.js";
import { CompilerError } from "./compilerError.js";

let nextIdentifierNumber = 0;

export abstract class Identifier implements Displayable {
    
    abstract getDisplayString(): string;
    
    abstract equals(identifier: Identifier): boolean;
    
    abstract getKey(): string;
}

export class NameIdentifier extends Identifier {
    name: string;
    
    constructor(name: string) {
        super();
        this.name = name;
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
    
    getKey(): string {
        return `name,${this.name}`;
    }
}

export class NumberIdentifier extends Identifier {
    value: number;
    
    constructor() {
        super();
        this.value = nextIdentifierNumber;
        nextIdentifierNumber += 1;
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
    
    getKey(): string {
        return `number,${this.value}`;
    }
}

export class IdentifierMap<T> {
    map: { [key: string]: T };
    keys: string[]; // Ensures correct order for iteration.
    
    constructor() {
        this.map = {};
        this.keys = [];
    }
    
    get(identifier: Identifier): T {
        const key = identifier.getKey();
        if (key in this.map) {
            return this.map[key];
        } else {
            return null;
        }
    }
    
    set(identifier: Identifier, value: T): void {
        const key = identifier.getKey();
        if (key in this.map) {
            throw new CompilerError("Duplicate identifier.");
        }
        this.map[key] = value;
        this.keys.push(key);
    }
    
    iterate(handle: (value: T) => void): void {
        for (const key of this.keys) {
            handle(this.map[key]);
        }
    }
    
    getValues(): T[] {
        const output: T[] = [];
        this.iterate((value) => {
            output.push(value);
        });
        return output;
    }
    
    getSize(): number {
        return this.keys.length;
    }
}


