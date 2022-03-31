
import { CompilerError } from "../compilerError.js";
import * as niceUtils from "../niceUtils.js";
import { TargetLanguage } from "../targetLanguage.js";
import { FunctionSignature, ContextFunctionSignature } from "../functionSignature.js";
import { FunctionDefinition } from "../definition/functionDefinition.js";
import { FunctionContextConstructor } from "../functionContext.js";
import { CompItem, CompKnown } from "./compItem.js";
import { ItemType } from "./itemType.js";
import { BasicType, ValueType, VoidType, IntegerType, PointerType, ArrayType, StructType, FunctionType, ListType } from "./basicType.js";
import { StorageType } from "./storageType.js";

export abstract class CompValue<T extends ValueType = ValueType> extends CompKnown<T> {
    // Excludes compT.
    storageTypes: StorageType[];
    
    constructor() {
        super();
        this.storageTypes = [];
    }
    
    abstract copyHelper(): CompValue;
    
    copy(): CompValue {
        const output = this.copyHelper();
        output.storageTypes = this.storageTypes.map((storageType) => storageType.copy());
        return output;
    }
    
    getStorageTypes(): StorageType[] {
        const output = super.getStorageTypes();
        niceUtils.extendList(output, this.storageTypes);
        return output;
    }
}

export class CompVoid extends CompValue<VoidType> {
    
    copyHelper(): CompValue {
        return new CompVoid();
    }
    
    getTypeHelper(): VoidType {
        return new VoidType();
    }
    
    getDisplayString(): string {
        return "(Void)";
    }
}

export class CompInteger extends CompValue<IntegerType> {
    value: bigint;
    integerType: IntegerType;
    
    constructor(value: bigint, integerType: IntegerType = null) {
        super();
        this.value = value;
        if (integerType === null) {
            this.integerType = new IntegerType();
        } else {
            this.integerType = integerType;
        }
    }
    
    copyHelper(): CompValue {
        return new CompInteger(this.value, this.integerType.copy() as IntegerType);
    }
    
    getTypeHelper(): IntegerType {
        return this.integerType;
    }
    
    convertToBoolean(): boolean {
        return (this.value !== 0n);
    }
    
    convertToBasicType(type: BasicType): CompKnown {
        if (type instanceof IntegerType) {
            const value = type.restrictInteger(this.value);
            return new CompInteger(value, type);
        } else {
            throw new CompilerError(`Cannot convert integer to ${type.getDisplayString()}.`);
        }
    }
    
    getDisplayString(): string {
        return this.value.toString();
    }
    
    convertToUnixC(): string {
        // TODO: Cast the integer to this.type.
        return this.value.toString();
    }
}

export class CompNull extends CompValue<PointerType> {
    pointerType: PointerType;
    
    constructor(pointerType: PointerType) {
        super();
        this.pointerType = pointerType;
    }
    
    copyHelper(): CompValue {
        return new CompNull(this.pointerType.copy() as PointerType);
    }
    
    getTypeHelper(): PointerType {
        return this.pointerType;
    }
    
    convertToBasicType(type: BasicType): CompKnown {
        if (type instanceof PointerType) {
            return new CompNull(type);
        } else {
            throw new CompilerError(`Cannot convert pointer to ${type.getDisplayString()}.`);
        }
    }
    
    getDisplayString(): string {
        return "NULL";
    }
    
    convertToUnixC(): string {
        return "NULL";
    }
}

export class CompArray extends CompValue<ArrayType> {
    elements: CompKnown[];
    elementType: ItemType;
    arrayType: ArrayType;
    
    constructor(elements: CompKnown[], elementType: ItemType = null) {
        super();
        this.elements = elements;
        if (elementType === null) {
            this.elementType = new ItemType();
        } else {
            this.elementType = elementType;
        }
        this.arrayType = new ArrayType(this.elementType, this.elements.length);
    }
    
    copyHelper(): CompValue {
        return new CompArray(
            this.elements.map((element) => element.copy() as CompKnown),
            this.elementType.copy(),
        );
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
    
    getTypeHelper(): ArrayType {
        return this.arrayType;
    }
    
    getDisplayString(): string {
        const textList = this.elements.map((element) => element.getDisplayString());
        return `{${textList.join(", ")}}:${this.arrayType.getDisplayString()}`;
    }
}

export class CompStruct extends CompValue<StructType> {
    structType: StructType;
    items: CompKnown[];
    itemMap: { [name: string]: CompKnown };
    
    constructor(structType: StructType, items: CompKnown[]) {
        super();
        this.structType = structType;
        this.items = items;
        this.itemMap = {};
        if (items.length !== this.structType.getDataFieldAmount()) {
            throw new CompilerError("Incorrect number of struct fields.");
        }
        this.structType.iterateOverDataFields((field, index) => {
            this.itemMap[field.name] = items[index];
        });
    }
    
    copyHelper(): CompValue {
        return new CompStruct(
            this.structType.copy() as StructType,
            this.items.map((item) => item.copy() as CompKnown),
        );
    }
    
    getTypeHelper(): StructType {
        return this.structType;
    }
    
    getDisplayString(): string {
        const textList = this.items.map((item) => item.getDisplayString());
        return `{${textList.join(", ")}}:${this.structType.getDisplayString()}`;
    }
}

export abstract class FunctionHandle extends CompValue<FunctionType> {
    
    abstract getSignature(): FunctionSignature;
    
    getTypeHelper(): FunctionType {
        return new FunctionType(this.getSignature());
    }
}

export class DefinitionFunctionHandle extends FunctionHandle {
    functionDefinition: FunctionDefinition;
    
    constructor(functionDefinition: FunctionDefinition) {
        super();
        this.functionDefinition = functionDefinition;
    }
    
    copyHelper(): CompValue {
        return new DefinitionFunctionHandle(this.functionDefinition);
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

export type BuiltInFunctionHandleConstructor<T extends BuiltInFunctionHandle = BuiltInFunctionHandle> = new (
    name: string,
    targetLanguage: TargetLanguage,
    contextConstructor: FunctionContextConstructor,
    argTypes: ItemType[],
    returnType: ItemType,
) => T;

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
    
    copyHelper(): CompValue {
        return new (this.constructor as BuiltInFunctionHandleConstructor)(
            this.name,
            this.targetLanguage,
            this.contextConstructor,
            this.signature.argTypes,
            this.signature.returnType,
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

export class CompList extends CompValue<ListType> {
    elements: CompKnown[];
    
    constructor(elements: CompKnown[]) {
        super();
        this.elements = elements;
    }
    
    copyHelper(): CompValue {
        return new CompList(this.elements.map((element) => element.copy() as CompKnown));
    }
    
    getTypeHelper(): ListType {
        return new ListType(this.elements.map((item) => item.getType()));
    }
    
    convertToBasicType(type: BasicType): CompKnown {
        if (type instanceof ListType) {
            return new CompList(this.elements.map((element, index) => {
                const elementType = type.elementTypes[index];
                return element.convertToType(elementType);
            }));
        } else if (type instanceof ArrayType) {
            return new CompArray(this.elements.map((element) => (
                element.convertToType(type.elementType)
            )), type.elementType);
        } else if (type instanceof StructType) {
            const fieldItems: CompKnown[] = [];
            type.iterateOverDataFields((field, index) => {
                const element = this.elements[index];
                const fieldItem = element.convertToType(field.type);
                fieldItems.push(fieldItem);
            });
            return new CompStruct(type, fieldItems);
        } else {
            throw new CompilerError(`Cannot convert list to ${type.getDisplayString()}.`);
        }
    }
    
    getDisplayString(): string {
        const textList = this.elements.map((item) => item.getDisplayString());
        return `{${textList.join(", ")}}`;
    }
}


