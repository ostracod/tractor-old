
import { CompilerError } from "../compilerError.js";
import { TargetLanguage } from "../targetLanguage.js";
import { FunctionSignature, ContextFunctionSignature } from "../functionSignature.js";
import { FunctionDefinition } from "../definition/functionDefinition.js";
import { FunctionContextConstructor } from "../functionContext.js";
import { CompItem, CompKnown } from "./compItem.js";
import { ItemType } from "./itemType.js";
import { VoidType, IntegerType, PointerType, ArrayType, StructType, FunctionType } from "./basicType.js";
import { LocationType } from "./storageType.js";

export abstract class CompValue extends CompKnown {
    
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

export class CompNull extends CompValue {
    type: PointerType;
    
    constructor(targetLanguage: TargetLanguage) {
        super();
        this.type = targetLanguage.createPointerType(new LocationType());
    }
    
    getType(): PointerType {
        return this.type;
    }
    
    getDisplayString(): string {
        return "NULL";
    }
    
    convertToUnixC(): string {
        return "NULL";
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

export class CompStruct extends CompValue {
    type: StructType;
    itemMap: { [name: string]: CompItem };
    
    constructor(type: StructType, itemMap: { [name: string]: CompItem }) {
        super();
        this.type = type;
        this.itemMap = itemMap;
    }
    
    getType(): StructType {
        return this.type;
    }
    
    getDisplayString(): string {
        const textList: string[] = [];
        for (const name in this.itemMap) {
            const item = this.itemMap[name];
            textList.push(item.getDisplayString());
        }
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
    
    getSignature(): FunctionSignature {
        return this.functionDefinition.signature;
    }
    
    getDisplayString(): string {
        return this.functionDefinition.identifierBehavior.getDisplayString();
    }
    
    convertToUnixC(): string {
        return this.functionDefinition.identifierBehavior.getCodeString();
    }
}

export class BuiltInFunctionHandle extends FunctionHandle {
    name: string;
    targetLanguage: TargetLanguage;
    contextConstructor: FunctionContextConstructor;
    signature: ContextFunctionSignature;
    
    constructor(
        name: string,
        targetLanguage: TargetLanguage,
        contextConstructor: FunctionContextConstructor,
        argTypes: ItemType[],
        returnType: ItemType,
    ) {
        super();
        this.name = name;
        this.targetLanguage = targetLanguage;
        this.contextConstructor = contextConstructor;
        this.signature = new ContextFunctionSignature(
            this.targetLanguage,
            false,
            argTypes,
            returnType,
            this.contextConstructor,
        );
    }
    
    getSignature(): FunctionSignature {
        return this.signature;
    }
    
    evaluateToCompItem(args: CompItem[]): CompItem {
        const context = new this.contextConstructor(this.targetLanguage, args);
        return context.getReturnItem();
    }
    
    getDisplayString(): string {
        return this.name;
    }
    
    convertInvocationToUnixC(argCodeList: string[]): string {
        throw new CompilerError(`Cannot convert ${this.name} to Unix C.`);
    }
}

export class NewPtrFunctionHandle extends BuiltInFunctionHandle {
    
    convertInvocationToUnixC(argCodeList: string[]): string {
        return `(&${argCodeList[0]})`;
    }
}

export class DerefPtrFunctionHandle extends BuiltInFunctionHandle {
    
    convertInvocationToUnixC(argCodeList: string[]): string {
        return `(*${argCodeList[0]})`;
    }
}


