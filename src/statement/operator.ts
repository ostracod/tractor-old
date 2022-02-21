
import { CompilerError } from "../compilerError.js";
import { CompItem } from "../compItem/compItem.js";
import { CompInteger } from "../compItem/compValue.js";
import { ItemType } from "../compItem/itemType.js";
import { IntegerType, booleanType, PointerType, ArrayType, StructType } from "../compItem/basicType.js";
import { NotType, OrType, AndType } from "../compItem/manipulationType.js";
import { OperatorSignature, UnaryOperatorSignature, IntegerOperatorSignature, TypeOperatorSignature, BinaryOperatorSignature, AssignmentOperatorSignature, TwoIntegersOperatorSignature, TwoTypesOperatorSignature, TwoPointersOperatorSignature, PointerIntegerOperatorSignature, IntegerPointerOperatorSignature, CastOperatorSignature } from "./operatorSignature.js";
import { Expression, ListExpression, ArrayExpression, StructExpression } from "./expression.js";

export const operatorTextSet = new Set<string>();
export const unaryOperatorMap: { [text: string]: UnaryOperator } = {};
export const binaryOperatorMap: { [text: string]: BinaryOperator } = {};

export abstract class Operator<T extends OperatorSignature> {
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

export abstract class UnaryOperator extends Operator<UnaryOperatorSignature> {
    
    constructor(text: string) {
        super(text);
        this.signatures.push(new IntegerOperatorSignature());
        unaryOperatorMap[this.text] = this;
    }
    
    getIntegerType(type: IntegerType): IntegerType {
        throw new CompilerError("getIntegerType is not implemented for this operator");
    }
    
    calculateInteger(operand: bigint): bigint {
        throw new CompilerError("calculateInteger is not implemented for this operator");
    }
    
    calculateItemByType(operand: ItemType): CompItem {
        throw new CompilerError("calculateItemByType is not implemented for this operator");
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
    
    generateUnixC(operand: Expression) {
        return `(${this.getUnixCText()} ${operand.convertToUnixC()})`;
    }
}

export abstract class UnaryTypeCopyOperator extends UnaryOperator {
    
    getIntegerType(type: IntegerType): IntegerType {
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

export class BitwiseInversionOperator extends UnaryTypeCopyOperator {
    
    constructor() {
        super("~");
        this.signatures.push(new TypeOperatorSignature());
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
    
    getIntegerType(type: IntegerType): IntegerType {
        return booleanType;
    }
    
    calculateInteger(operand: bigint): bigint {
        return (operand === 0n) ? 1n : 0n;
    }
}

export class BinaryOperator extends Operator<BinaryOperatorSignature> {
    precedence: number;
    
    constructor(text: string, precedence: number) {
        super(text);
        this.precedence = precedence;
        binaryOperatorMap[this.text] = this;
    }
    
    getIntegerType(type1: IntegerType, type2: IntegerType): IntegerType {
        throw new CompilerError("getIntegerType is not implemented for this operator");
    }
    
    getTypeByPointers(type1: PointerType, type2: PointerType): ItemType {
        throw new CompilerError("getTypeByPointers is not implemented for this operator");
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        throw new CompilerError("calculateInteger is not implemented for this operator");
    }
    
    calculateItemByTypes(operand1: ItemType, operand2: ItemType): CompItem {
        throw new CompilerError("calculateItemByTypes is not implemented for this operator");
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
    
    generateUnixC(operand1: Expression, operand2: Expression) {
        const code1 = operand1.convertToUnixC();
        const code2 = operand2.convertToUnixC();
        return `(${code1} ${this.getUnixCText()} ${code2})`;
    }
}

export class AssignmentOperator extends BinaryOperator {
    
    constructor(text: string, precedence: number) {
        super(text, precedence);
        this.signatures.push(new AssignmentOperatorSignature());
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

export class CastOperator extends BinaryOperator {
    
    constructor() {
        super(":", 2);
        this.signatures.push(new CastOperatorSignature());
    }
    
    castExpressionTypes(expression: Expression, type: ItemType): Expression {
        if (!(expression instanceof ListExpression)) {
            return null;
        }
        const expressions = expression.expressions.map((slot) => slot.get().copy());
        if (type instanceof ArrayType) {
            if (type.length !== null && type.length !== expressions.length) {
                throw new CompilerError("Invalid array length.");
            }
            const arrayType = new ArrayType(type.elementType, expressions.length);
            return new ArrayExpression(expressions, arrayType);
        } else if (type instanceof StructType) {
            if (type.fieldList.length !== expressions.length) {
                throw new CompilerError("Incorrect number of struct fields.");
            }
            return new StructExpression(expressions, type);
        } else {
            throw new CompilerError("Invalid type cast.");
        }
    }
}

export abstract class BinaryIntegerOperator extends BinaryOperator {
    
    constructor(text: string, precedence: number) {
        super(text, precedence);
        this.signatures.push(new TwoIntegersOperatorSignature());
    }
}

export abstract class BinaryTypeMergeOperator extends BinaryIntegerOperator {
    
    getIntegerType(type1: IntegerType, type2: IntegerType): IntegerType {
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
        this.signatures.push(new PointerIntegerOperatorSignature());
        this.signatures.push(new IntegerPointerOperatorSignature());
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 + operand2;
    }
}

export class SubtractionOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("-", 4);
        this.signatures.push(new TwoPointersOperatorSignature());
        this.signatures.push(new PointerIntegerOperatorSignature());
    }
    
    getTypeByPointers(type1: PointerType, type2: PointerType): ItemType {
        return new IntegerType();
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 - operand2;
    }
}

export abstract class BitshiftOperator extends BinaryIntegerOperator {
    
    constructor(text: string) {
        super(text, 5);
    }
    
    getIntegerType(type1: IntegerType, type2: IntegerType): IntegerType {
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
    
    getIntegerType(type1: IntegerType, type2: IntegerType): IntegerType {
        return booleanType;
    }
}

export abstract class ComparisonOperator extends BinaryIntegerOperator {
    
    constructor(text: string, precedence: number) {
        super(text, precedence);
        this.signatures.push(new TwoPointersOperatorSignature());
    }
    
    getTypeByPointers(type1: PointerType, type2: PointerType): ItemType {
        return booleanType;
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

export class EqualityOperator extends ComparisonOperator {
    
    constructor() {
        super("==", 7);
        this.signatures.push(new TwoTypesOperatorSignature());
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 === operand2);
    }
    
    calculateItemByTypes(operand1: ItemType, operand2: ItemType): CompItem {
        const value = operand1.equalsType(operand2) ? 1n : 0n;
        return new CompInteger(value, booleanType);
    }
}

export class InequalityOperator extends ComparisonOperator {
    
    constructor() {
        super("!=", 7);
        this.signatures.push(new TwoTypesOperatorSignature());
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
    
    constructor(text: string, precedence: number) {
        super(text, precedence);
        this.signatures.push(new TwoTypesOperatorSignature());
    }
}

export class BitwiseAndOperator extends BitwiseOperator {
    
    constructor() {
        super("&", 8);
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

export class BitwiseOrOperator extends BitwiseOperator {
    
    constructor() {
        super("|", 10);
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
    generateUnixC(operand1: Expression, operand2: Expression) {
        const code1 = operand1.convertToUnixC();
        const code2 = operand2.convertToUnixC();
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

new BinaryOperator(".", 0);
new CastOperator();
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


