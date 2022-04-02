
import { CompilerError } from "../compilerError.js";
import * as niceUtils from "../niceUtils.js";
import { TargetLanguage } from "../targetLanguage.js";
import { FunctionSignature, ContextFunctionSignature } from "../functionSignature.js";
import { FunctionDefinition } from "../definition/functionDefinition.js";
import { FunctionContextConstructor } from "../functionContext.js";
import { CompItem, CompKnown } from "./compItem.js";
import { ItemType } from "./itemType.js";
import { BasicType, ValueType, VoidType, IntegerType, PointerType, ArrayType, StructType, FunctionType, ListType } from "./basicType.js";
import { StorageType, CompType } from "./storageType.js";

export abstract class CompValue<T extends ValueType = ValueType> extends CompKnown<T> {
    type: T;
    
    constructor(type: T) {
        super();
        this.type = type.copy() as T;
        this.enforceCompType();
    }
    
    abstract copy(): CompValue<T>;
    
    getType(): ItemType {
        return this.type;
    }
    
    addStorageType(type: StorageType): void {
        this.type.addStorageType(type);
    }
    
    enforceCompType(): void {
        this.addStorageType(new CompType());
    }
    
    setStorageTypes(types: StorageType[]): void {
        this.type.setStorageTypes(types);
        this.enforceCompType();
    }
}

export class CompVoid extends CompValue<VoidType> {
    
    constructor() {
        super(new VoidType());
    }
    
    copy(): CompVoid {
        return new CompVoid();
    }
    
    getDisplayString(): string {
        return "(Void)";
    }
}

export class CompInteger extends CompValue<IntegerType> {
    value: bigint;
    
    constructor(value: bigint, type: IntegerType = null) {
        if (type === null) {
            type = new IntegerType();
        }
        super(type);
        this.value = value;
    }
    
    copy(): CompInteger {
        return new CompInteger(this.value, this.type);
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
    
    constructor(type: PointerType) {
        super(type);
    }
    
    copy(): CompNull {
        return new CompNull(this.type);
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
    
    constructor(elements: CompKnown[], type: ArrayType = null) {
        if (type === null) {
            type = new ArrayType(new ItemType(), elements.length);
        }
        super(type);
        this.elements = elements;
    }
    
    copy(): CompArray {
        return new CompArray(
            this.elements.map((element) => element.copy()),
            this.type,
        );
    }
    
    convertToString(): string {
        if (!(this.type.elementType instanceof IntegerType)) {
            throw new CompilerError("Expected an array of characters.");
        }
        const numberList = this.elements.map((element) => (
            Number((element as CompInteger).value)
        ));
        const buffer = Buffer.from(numberList);
        return buffer.toString("utf8");
    }
    
    getDisplayString(): string {
        const textList = this.elements.map((element) => element.getDisplayString());
        return `{${textList.join(", ")}}:${this.type.getDisplayString()}`;
    }
}

export const createCompArray = (elements: CompKnown[], elementType: ItemType): CompArray => {
    const type = new ArrayType(elementType, elements.length);
    return new CompArray(elements, type);
}

export class CompStruct extends CompValue<StructType> {
    items: CompKnown[];
    itemMap: { [name: string]: CompKnown };
    
    constructor(type: StructType, items: CompKnown[]) {
        super(type);
        this.items = items;
        this.itemMap = {};
        if (items.length !== this.type.getDataFieldAmount()) {
            throw new CompilerError("Incorrect number of struct fields.");
        }
        this.type.iterateOverDataFields((field, index) => {
            this.itemMap[field.name] = items[index];
        });
    }
    
    copy(): CompStruct {
        return new CompStruct(
            this.type,
            this.items.map((item) => item.copy()),
        );
    }
    
    getDisplayString(): string {
        const textList = this.items.map((item) => item.getDisplayString());
        return `{${textList.join(", ")}}:${this.type.getDisplayString()}`;
    }
}

export abstract class FunctionHandle extends CompValue<FunctionType> {
    
    constructor(signature: FunctionSignature) {
        super(new FunctionType(signature));
    }
}

export class DefinitionFunctionHandle extends FunctionHandle {
    functionDefinition: FunctionDefinition;
    
    constructor(functionDefinition: FunctionDefinition) {
        super(functionDefinition.signature);
        this.functionDefinition = functionDefinition;
    }
    
    copy(): DefinitionFunctionHandle {
        return new DefinitionFunctionHandle(this.functionDefinition);
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
        const signature = new ContextFunctionSignature(
            targetLanguage,
            false,
            argTypes,
            returnType,
            contextConstructor,
        );
        super(signature);
        this.name = name;
        this.targetLanguage = targetLanguage;
        this.contextConstructor = contextConstructor;
        this.signature = signature;
    }
    
    copy(): BuiltInFunctionHandle {
        return new (this.constructor as BuiltInFunctionHandleConstructor)(
            this.name,
            this.targetLanguage,
            this.contextConstructor,
            this.signature.argTypes,
            this.signature.returnType,
        );
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
        const type = new ListType(elements.map((item) => item.getType()));
        super(type);
        this.elements = elements;
    }
    
    copy(): CompList {
        return new CompList(this.elements.map((element) => element.copy()));
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
            )), type);
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


