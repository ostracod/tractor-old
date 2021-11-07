
import { Displayable } from "./interfaces.js";
import { constructors } from "./constructors.js";
import { CompilerError } from "./compilerError.js";
import { IdentifierFunctionDefinition } from "./functionDefinition.js";
import { ItemType, VoidType, IntegerType, ArrayType, FunctionHandleType } from "./itemType.js";

export abstract class CompItem implements Displayable {
    
    abstract getType(): ItemType;
    
    abstract getDisplayString(): string;
    
    convertToBoolean(): boolean {
        throw new CompilerError(`Cannot convert ${this.getDisplayString()} to boolean.`);
    }
    
    convertToUnixC(): string {
        throw new CompilerError(`Cannot convert ${this.getDisplayString()} to Unix C.`);
    }
}

export abstract class CompValue extends CompItem {
    
}

export class CompVoid extends CompValue {
    
    getType(): VoidType {
        return new constructors.VoidType();
    }
    
    getDisplayString(): string {
        return "(Void)";
    }
}

export class CompInteger extends CompValue {
    value: bigint;
    type: IntegerType;
    
    constructor(value: bigint, type: IntegerType = null) {
        super();
        this.value = value;
        if (type === null) {
            this.type = new constructors.IntegerType();
        } else {
            this.type = type;
        }
    }
    
    getType(): IntegerType {
        return this.type;
    }
    
    convertToBoolean(): boolean {
        return (this.value !== 0n);
    }
    
    getDisplayString(): string {
        return this.value.toString();
    }
    
    convertToUnixC(): string {
        // TODO: Cast the integer to this.type.
        return this.value.toString();
    }
}

export class CompArray extends CompValue {
    elements: CompItem[];
    elementType: ItemType;
    type: ArrayType;
    
    constructor(elements: CompItem[], elementType: ItemType = null) {
        super();
        this.elements = elements;
        if (elementType === null) {
            this.elementType = new constructors.ItemType();
        } else {
            this.elementType = elementType;
        }
        this.type = new constructors.ArrayType(this.elementType, this.elements.length);
    }
    
    convertToString(): string {
        if (!(this.elementType instanceof constructors.IntegerType)) {
            throw new CompilerError("Expected an array of characters.");
        }
        const numberList = this.elements.map((element) => (
            Number((element as CompInteger).value)
        ));
        const buffer = Buffer.from(numberList);
        return buffer.toString("utf8");
    }
    
    getType(): ArrayType {
        return this.type;
    }
    
    getDisplayString(): string {
        const textList = this.elements.map((element) => element.getDisplayString());
        return `{${textList.join(", ")}}:${this.type.getDisplayString()}`;
    }
}

export class CompFunctionHandle extends CompValue {
    functionDefinition: IdentifierFunctionDefinition;
    
    constructor(functionDefinition: IdentifierFunctionDefinition) {
        super();
        this.functionDefinition = functionDefinition;
    }
    
    getType(): FunctionHandleType {
        // TODO: Implement.
        return null;
    }
    
    getDisplayString(): string {
        return this.functionDefinition.identifierBehavior.getDisplayString();
    }
    
    convertToUnixC(): string {
        return this.functionDefinition.identifierBehavior.getCodeString();
    }
}


