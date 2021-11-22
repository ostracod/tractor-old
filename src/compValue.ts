
import { CompilerError } from "./compilerError.js";
import { FunctionDefinition } from "./functionDefinition.js";
import { FunctionSignature, SimpleFunctionSignature, DefinitionFunctionSignature } from "./functionSignature.js";
import { CompItem } from "./compItem.js";
import { ItemType, TypeType, VoidType, IntegerType, ArrayType, FunctionType} from "./itemType.js";

export abstract class CompValue extends CompItem {
    
}

export class CompVoid extends CompValue {
    
    getType(): VoidType {
        return new VoidType();
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
            this.type = new IntegerType();
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
            this.elementType = new ItemType();
        } else {
            this.elementType = elementType;
        }
        this.type = new ArrayType(this.elementType, this.elements.length);
    }
    
    convertToString(): string {
        if (!(this.elementType instanceof IntegerType)) {
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

export abstract class FunctionHandle extends CompValue {
    
    abstract getSignature(): FunctionSignature;
    
    getType(): FunctionType {
        return new FunctionType(this.getSignature());
    }
}

export class DefinitionFunctionHandle extends FunctionHandle {
    functionDefinition: FunctionDefinition;
    
    constructor(functionDefinition: FunctionDefinition) {
        super();
        this.functionDefinition = functionDefinition;
    }
    
    getSignature(): DefinitionFunctionSignature {
        return this.functionDefinition.signature;
    }
    
    getDisplayString(): string {
        return this.functionDefinition.identifierBehavior.getDisplayString();
    }
    
    convertToUnixC(): string {
        return this.functionDefinition.identifierBehavior.getCodeString();
    }
}

export abstract class BuiltInFunctionHandle extends FunctionHandle {
    
    // TODO: Verify argument count and types.
    evaluateToCompItem(args: CompItem[]): CompItem {
        return null;
    }
}

export class ArrayTFunctionHandle extends BuiltInFunctionHandle {
    
    getSignature(): FunctionSignature {
        // TODO: Return type should depend on arguments.
        return new SimpleFunctionSignature([
            new TypeType(new ItemType()),
            new IntegerType(false, 64),
        ], new TypeType(new ArrayType(new ItemType())));
    }
    
    evaluateToCompItem(args: CompItem[]): CompItem {
        const type = args[0] as ItemType;
        const length = Number((args[1] as CompInteger).value);
        return new ArrayType(type, length);
    }
    
    getDisplayString(): string {
        return "arrayT";
    }
}


