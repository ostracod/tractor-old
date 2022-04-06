
import { CompilerError } from "../compilerError.js";
import * as typeUtils from "../compItem/typeUtils.js";
import { CompItem } from "../compItem/compItem.js";
import { CompInteger } from "../compItem/compValue.js";
import { ItemType } from "../compItem/itemType.js";
import { IntegerType, booleanType, PointerType } from "../compItem/basicType.js";
import { NotType, OrType, AndType } from "../compItem/manipulationType.js";
import { StorageType, CompType } from "../compItem/storageType.js";
import { OperatorInterface, UnaryOperatorInterface, IntegerOperatorInterface, TypeOperatorInterface, BinaryOperatorInterface, TwoIntegersOperatorInterface, TwoTypesOperatorInterface, TwoPointersOperatorInterface, ConversionOperatorInterface } from "./operatorInterfaces.js";
import { OperatorSignature, UnaryOperatorSignature, IntegerOperatorSignature, TypeOperatorSignature, BinaryOperatorSignature, AssignmentOperatorSignature, TwoIntegersOperatorSignature, TwoTypesOperatorSignature, TwoPointersOperatorSignature, PointerIntegerOperatorSignature, IntegerPointerOperatorSignature, ConversionOperatorSignature } from "./operatorSignature.js";
import { Expression } from "./expression.js";

export const operatorTextSet = new Set<string>();
export const unaryOperatorMap: { [text: string]: UnaryOperator } = {};
export const binaryOperatorMap: { [text: string]: BinaryOperator } = {};

export abstract class Operator<T extends OperatorSignature> implements OperatorInterface {
    text: string;
    signatures: T[];
    
    constructor(text: string) {
        this.text = text;
        this.signatures = [];
        operatorTextSet.add(text);
    }
    
    createTypeError(): CompilerError {
        const descriptions = this.signatures.map((signature) => signature.getDescription());
        let message = null;
        if (descriptions.length < 1) {
            message = "Operator has no signatures.";
        } else if (descriptions.length < 3) {
            message = `Operator expects ${descriptions.join(" or ")}.`;
        } else {
            const tempDescriptions = descriptions.slice();
            const lastDescription = tempDescriptions.pop();
            message = `Operator expects ${tempDescriptions.join(", ")}, or ${lastDescription}.`;
        }
        return new CompilerError(message);
    }
    
    getUnixCText(): string {
        return this.text;
    }
}

export abstract class UnaryOperator extends Operator<UnaryOperatorSignature> implements UnaryOperatorInterface, IntegerOperatorInterface {
    
    constructor(text: string) {
        super(text);
        this.signatures.push(new IntegerOperatorSignature(this));
        unaryOperatorMap[this.text] = this;
    }
    
    abstract calculateInteger(operand: bigint): bigint;
    
    // Ignores storage types.
    abstract getIntegerTypeHelper(type: IntegerType): IntegerType;
    
    getIntegerStorageTypes(type: IntegerType): StorageType[] {
        return typeUtils.matchStorageTypes(type, [CompType]);
    }
    
    getIntegerType(type: IntegerType): IntegerType {
        const output = this.getIntegerTypeHelper(type).copy() as IntegerType;
        const storageTypes = this.getIntegerStorageTypes(type);
        output.setStorageTypes(storageTypes);
        return output;
    }
    
    calculateCompItem(operand: CompItem): CompItem {
        for (const signature of this.signatures) {
            const result = signature.calculateCompItem(this, operand);
            if (result !== null) {
                return result;
            }
        }
        throw this.createTypeError();
    }
    
    generateUnixC(expression: Expression): string {
        return `(${this.getUnixCText()} ${expression.convertToUnixC()})`;
    }
}

export abstract class UnaryTypeCopyOperator extends UnaryOperator {
    
    getIntegerTypeHelper(type: IntegerType): IntegerType {
        return type;
    }
}

export class NegationOperator extends UnaryTypeCopyOperator {
    
    constructor() {
        super("-");
    }
    
    calculateInteger(operand: bigint): bigint {
        return -operand;
    }
}

export class BitwiseInversionOperator extends UnaryTypeCopyOperator implements TypeOperatorInterface {
    
    constructor() {
        super("~");
        this.signatures.push(new TypeOperatorSignature(this));
    }
    
    calculateInteger(operand: bigint): bigint {
        return ~operand;
    }
    
    calculateItemByType(operand: ItemType): CompItem {
        return new NotType(operand);
    }
}

export class BooleanInversionOperator extends UnaryOperator {
    
    constructor() {
        super("!");
    }
    
    getIntegerTypeHelper(type: IntegerType): IntegerType {
        return booleanType;
    }
    
    calculateInteger(operand: bigint): bigint {
        return (operand === 0n) ? 1n : 0n;
    }
}

export abstract class BinaryOperator extends Operator<BinaryOperatorSignature> implements BinaryOperatorInterface {
    precedence: number;
    
    constructor(text: string, precedence: number) {
        super(text);
        this.precedence = precedence;
        binaryOperatorMap[this.text] = this;
    }
    
    calculateCompItem(operand1: CompItem, operand2: CompItem): CompItem {
        for (const signature of this.signatures) {
            const result = signature.calculateCompItem(this, operand1, operand2);
            if (result !== null) {
                return result;
            }
        }
        throw this.createTypeError();
    }
    
    generateUnixC(expression1: Expression, expression2: Expression): string {
        const code1 = expression1.convertToUnixC();
        const code2 = expression2.convertToUnixC();
        return `(${code1} ${this.getUnixCText()} ${code2})`;
    }
}

export class AssignmentOperator extends BinaryOperator {
    
    constructor(text: string, precedence: number) {
        super(text, precedence);
        this.signatures.push(new AssignmentOperatorSignature(this));
    }
}

export class InitializationOperator extends AssignmentOperator {
    precedence: number;
    
    constructor() {
        super(":=", 14);
    }
    
    getUnixCText(): string {
        return "=";
    }
}

export class ConversionOperator extends BinaryOperator implements ConversionOperatorInterface {
    
    constructor(text = "::") {
        super(text, 2);
        this.signatures.push(new ConversionOperatorSignature(this));
    }
    
    getConversionType(type1: ItemType, type2: ItemType): ItemType {
        return type2;
    }
    
    generateUnixC(expression1: Expression, expression2: Expression): string {
        const code1 = expression1.convertToUnixC();
        const code2 = expression2.convertToUnixC();
        return `((${code2})${code1})`;
    }
}

export class CastOperator extends ConversionOperator {
    
    constructor() {
        super(":");
    }
    
    getConversionType(type1: ItemType, type2: ItemType): ItemType {
        const output = type1.intersectType(type2);
        if (output === null) {
            throw new CompilerError("Cannot cast type.");
        }
        return output;
    }
}

export abstract class BinaryIntegerOperator extends BinaryOperator implements TwoIntegersOperatorInterface {
    
    constructor(text: string, precedence: number) {
        super(text, precedence);
        this.signatures.push(new TwoIntegersOperatorSignature(this));
    }
    
    // Ignores storage types.
    abstract getIntegerTypeHelper(type1: IntegerType, type2: IntegerType): IntegerType;
    
    getIntegerStorageTypes(type1: IntegerType, type2: IntegerType): StorageType[] {
        const compType1 = typeUtils.matchStorageType(type1, CompType);
        const compType2 = typeUtils.matchStorageType(type2, CompType);
        if ((compType1 !== null && compType1.isComplement)
                || (compType2 !== null && compType2.isComplement)) {
            return [new CompType(true)];
        }
        if (compType1 === null || compType2 === null) {
            return [];
        }
        return [new CompType()];
    }
    
    getIntegerType(type1: IntegerType, type2: IntegerType): IntegerType {
        const output = this.getIntegerTypeHelper(type1, type2).copy() as IntegerType;
        const storageTypes = this.getIntegerStorageTypes(type1, type2);
        output.setStorageTypes(storageTypes);
        return output;
    }
    
    abstract calculateInteger(operand1: bigint, operand2: bigint): bigint;
}

export abstract class BinaryTypeMergeOperator extends BinaryIntegerOperator {
    
    getIntegerTypeHelper(type1: IntegerType, type2: IntegerType): IntegerType {
        // isSigned and bitAmount are nullable, so
        // we need to be a little careful here.
        let isSigned: boolean;
        if (type1.isSigned === true || type2.isSigned === true) {
            isSigned = true;
        } else if (type1.isSigned === false || type2.isSigned === false) {
            isSigned = false;
        } else {
            isSigned = null;
        }
        let bitAmount: number;
        if (type1.bitAmount === null) {
            bitAmount = type2.bitAmount;
        } else if (type2.bitAmount === null) {
            bitAmount = type1.bitAmount;
        } else {
            bitAmount = Math.max(type1.bitAmount, type2.bitAmount);
        }
        return new IntegerType(isSigned, bitAmount);
    }
}

export class MultiplicationOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("*", 3);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 * operand2;
    }
}

export class DivisionOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("/", 3);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        if (operand2 === 0n) {
            throw new CompilerError("Division by zero.");
        }
        return operand1 / operand2;
    }
}

export class ModulusOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("%", 3);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        if (operand2 === 0n) {
            throw new CompilerError("Division by zero.");
        }
        return operand1 % operand2;
    }
}

export class AdditionOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("+", 4);
        this.signatures.push(new PointerIntegerOperatorSignature(this));
        this.signatures.push(new IntegerPointerOperatorSignature(this));
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 + operand2;
    }
}

export class SubtractionOperator extends BinaryTypeMergeOperator implements TwoPointersOperatorInterface {
    
    constructor() {
        super("-", 4);
        this.signatures.push(new TwoPointersOperatorSignature(this));
        this.signatures.push(new PointerIntegerOperatorSignature(this));
    }
    
    getTypeByPointers(type1: PointerType, type2: PointerType): ItemType {
        // TODO: Decide what the size of the integer should be.
        const output = new IntegerType();
        output.setStorageTypes([new CompType(true)]);
        return output;
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 - operand2;
    }
}

export abstract class BitshiftOperator extends BinaryIntegerOperator {
    
    constructor(text: string) {
        super(text, 5);
    }
    
    getIntegerTypeHelper(type1: IntegerType, type2: IntegerType): IntegerType {
        return type1;
    }
}

export class BitshiftRightOperator extends BitshiftOperator {
    
    constructor() {
        super(">>");
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 >> operand2;
    }
}

export class BitshiftLeftOperator extends BitshiftOperator {
    
    constructor() {
        super("<<");
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 << operand2;
    }
}

export abstract class BinaryBooleanOperator extends BinaryIntegerOperator {
    
    abstract calculateBoolean(operand1: bigint, operand2: bigint): boolean;
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return this.calculateBoolean(operand1, operand2) ? 1n : 0n;
    }
    
    getIntegerTypeHelper(type1: IntegerType, type2: IntegerType): IntegerType {
        return booleanType;
    }
}

export abstract class ComparisonOperator extends BinaryBooleanOperator implements TwoPointersOperatorInterface {
    
    constructor(text: string, precedence: number) {
        super(text, precedence);
        this.signatures.push(new TwoPointersOperatorSignature(this));
    }
    
    getTypeByTypes(): ItemType {
        const output = booleanType.copy();
        output.setStorageTypes([new CompType()]);
        return output;
    }
    
    getTypeByPointers(type1: PointerType, type2: PointerType): ItemType {
        const output = booleanType.copy();
        booleanType.setStorageTypes([new CompType(true)]);
        return output;
    }
}

export class GreaterThanOperator extends ComparisonOperator {
    
    constructor() {
        super(">", 6);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 > operand2);
    }
}

export class GreaterOrEqualOperator extends ComparisonOperator {
    
    constructor() {
        super(">=", 6);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 >= operand2);
    }
}

export class LessThanOperator extends ComparisonOperator {
    
    constructor() {
        super("<", 6);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 < operand2);
    }
}

export class LessOrEqualOperator extends ComparisonOperator {
    
    constructor() {
        super("<=", 6);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 <= operand2);
    }
}

export class EqualityOperator extends ComparisonOperator implements TwoTypesOperatorInterface {
    
    constructor() {
        super("==", 7);
        this.signatures.push(new TwoTypesOperatorSignature(this));
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 === operand2);
    }
    
    calculateItemByTypes(operand1: ItemType, operand2: ItemType): CompItem {
        const value = operand1.equalsType(operand2) ? 1n : 0n;
        return new CompInteger(value, booleanType);
    }
}

export class InequalityOperator extends ComparisonOperator implements TwoTypesOperatorInterface {
    
    constructor() {
        super("!=", 7);
        this.signatures.push(new TwoTypesOperatorSignature(this));
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 !== operand2);
    }
    
    calculateItemByTypes(operand1: ItemType, operand2: ItemType): CompItem {
        const value = operand1.equalsType(operand2) ? 0n : 1n;
        return new CompInteger(value, booleanType);
    }
}

export abstract class BitwiseOperator extends BinaryTypeMergeOperator {
    
    getTypeByTypes(): ItemType {
        return null;
    }
}

export class BitwiseAndOperator extends BitwiseOperator implements TwoTypesOperatorInterface {
    
    constructor() {
        super("&", 8);
        this.signatures.push(new TwoTypesOperatorSignature(this));
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 & operand2;
    }
    
    calculateItemByTypes(operand1: ItemType, operand2: ItemType): CompItem {
        return new AndType(operand1, operand2);
    }
}

export class BitwiseXorOperator extends BitwiseOperator {
    
    constructor() {
        super("^", 9);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 ^ operand2;
    }
}

export class BitwiseOrOperator extends BitwiseOperator implements TwoTypesOperatorInterface {
    
    constructor() {
        super("|", 10);
        this.signatures.push(new TwoTypesOperatorSignature(this));
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 | operand2;
    }
    
    calculateItemByTypes(operand1: ItemType, operand2: ItemType): CompItem {
        return new OrType(operand1, operand2);
    }
}

export class BooleanAndOperator extends BinaryBooleanOperator {
    
    constructor() {
        super("&&", 11);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return ((operand1 !== 0n) && (operand2 !== 0n));
    }
}

export class BooleanXorOperator extends BinaryBooleanOperator {
    
    constructor() {
        super("^^", 12);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return ((operand1 !== 0n) !== (operand2 !== 0n));
    }
    
    // If only C had a boolean XOR operator...
    generateUnixC(expression1: Expression, expression2: Expression): string {
        const code1 = expression1.convertToUnixC();
        const code2 = expression2.convertToUnixC();
        return `(!(${code1}) == !(${code2}))`;
    }
}

export class BooleanOrOperator extends BinaryBooleanOperator {
    
    constructor() {
        super("||", 13);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return ((operand1 !== 0n) || (operand2 !== 0n));
    }
}

new NegationOperator();
new BitwiseInversionOperator();
new BooleanInversionOperator();

new CastOperator();
new ConversionOperator();
new MultiplicationOperator();
new DivisionOperator();
new ModulusOperator();
new AdditionOperator();
new SubtractionOperator();
new BitshiftRightOperator();
new BitshiftLeftOperator();
new GreaterThanOperator();
new GreaterOrEqualOperator();
new LessThanOperator();
new LessOrEqualOperator();
new EqualityOperator();
new InequalityOperator();
new BitwiseAndOperator();
new BitwiseXorOperator();
new BitwiseOrOperator();
new BooleanAndOperator();
new BooleanXorOperator();
new BooleanOrOperator();
new AssignmentOperator("=", 14);
new AssignmentOperator("+=", 14);
new AssignmentOperator("-=", 14);
new AssignmentOperator("*=", 14);
new AssignmentOperator("/=", 14);
new AssignmentOperator("%=", 14);
new AssignmentOperator("&=", 14);
new AssignmentOperator("^=", 14);
new AssignmentOperator("|=", 14);
new AssignmentOperator(">>=", 14);
new AssignmentOperator("<<=", 14);
new AssignmentOperator("&&=", 14);
new AssignmentOperator("^^=", 14);
new AssignmentOperator("||=", 14);
export const initializationOperator = new InitializationOperator();


