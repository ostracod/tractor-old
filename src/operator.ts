
import { CompilerError } from "./compilerError.js";
import { CompItem } from "./compItem.js";
import { CompVoid, CompInteger } from "./compValue.js";
import { IntegerType } from "./itemType.js";
import { Expression } from "./expression.js";

export const operatorTextSet = new Set<string>();
export const unaryOperatorMap: { [text: string]: UnaryOperator } = {};
export const binaryOperatorMap: { [text: string]: BinaryOperator } = {};

export class Operator {
    text: string;
    
    constructor(text: string) {
        this.text = text;
        operatorTextSet.add(text);
    }
    
    getUnixCText(): string {
        return this.text;
    }
}

export abstract class UnaryOperator extends Operator {
    
    constructor(text: string) {
        super(text);
        unaryOperatorMap[this.text] = this;
    }
    
    abstract calculateInteger(operand: bigint): bigint;
    
    abstract getType(type: IntegerType): IntegerType;
    
    calculateCompItem(operand: CompItem): CompItem {
        if (!(operand instanceof CompInteger)) {
            throw new CompilerError("Expected integer operand.");
        }
        const resultType = this.getType(operand.getType());
        let resultInteger = this.calculateInteger(operand.value);
        resultInteger = resultType.restrictInteger(resultInteger);
        return new CompInteger(resultInteger, resultType);
    }
    
    generateUnixC(operand: Expression) {
        return `(${this.getUnixCText()} ${operand.convertToUnixC()})`;
    }
}

export abstract class UnaryTypeCopyOperator extends UnaryOperator {
    
    getType(type: IntegerType): IntegerType {
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
    }
    
    calculateInteger(operand: bigint): bigint {
        return ~operand;
    }
}

export class BooleanInversionOperator extends UnaryOperator {
    
    constructor() {
        super("!");
    }
    
    calculateInteger(operand: bigint): bigint {
        return (operand === 0n) ? 1n : 0n;
    }
    
    getType(type: IntegerType): IntegerType {
        return new IntegerType(false, 8)
    }
}

export class BinaryOperator extends Operator {
    precedence: number;
    
    constructor(text: string, precedence: number) {
        super(text);
        this.precedence = precedence;
        binaryOperatorMap[this.text] = this;
    }
    
    calculateCompItem(operand1: CompItem, operand2: CompItem): CompItem {
        return new CompVoid();
    }
    
    generateUnixC(operand1: Expression, operand2: Expression) {
        const code1 = operand1.convertToUnixC();
        const code2 = operand2.convertToUnixC();
        return `(${code1} ${this.getUnixCText()} ${code2})`;
    }
}

export class InitializationOperator extends BinaryOperator {
    precedence: number;
    
    constructor() {
        super(":=", 14);
    }
    
    getUnixCText(): string {
        return "=";
    }
}

export abstract class BinaryIntegerOperator extends BinaryOperator {
    
    abstract calculateInteger(operand1: bigint, operand2: bigint): bigint;
    
    abstract getType(type1: IntegerType, type2: IntegerType): IntegerType;
    
    calculateCompItem(operand1: CompItem, operand2: CompItem): CompItem {
        if (!(operand1 instanceof CompInteger) || !(operand2 instanceof CompInteger)) {
            throw new CompilerError("Expected integer operand.");
        }
        const resultType = this.getType(operand1.getType(), operand2.getType());
        let resultInteger = this.calculateInteger(operand1.value, operand2.value);
        resultInteger = resultType.restrictInteger(resultInteger);
        return new CompInteger(resultInteger, resultType);
    }
}

export abstract class BinaryTypeMergeOperator extends BinaryIntegerOperator {
    
    getType(type1: IntegerType, type2: IntegerType): IntegerType {
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
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 + operand2;
    }
}

export class SubtractionOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("-", 4);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 - operand2;
    }
}

export abstract class BitshiftOperator extends BinaryIntegerOperator {
    
    constructor(text: string) {
        super(text, 5);
    }
    
    getType(type1: IntegerType, type2: IntegerType): IntegerType {
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
    
    getType(type1: IntegerType, type2: IntegerType): IntegerType {
        return new IntegerType(false, 8);
    }
}

export class GreaterThanOperator extends BinaryBooleanOperator {
    
    constructor() {
        super(">", 6);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 > operand2);
    }
}

export class GreaterOrEqualOperator extends BinaryBooleanOperator {
    
    constructor() {
        super(">=", 6);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 >= operand2);
    }
}

export class LessThanOperator extends BinaryBooleanOperator {
    
    constructor() {
        super("<", 6);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 < operand2);
    }
}

export class LessOrEqualOperator extends BinaryBooleanOperator {
    
    constructor() {
        super("<=", 6);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 <= operand2);
    }
}

export class EqualityOperator extends BinaryBooleanOperator {
    
    constructor() {
        super("==", 7);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 === operand2);
    }
}

export class InequalityOperator extends BinaryBooleanOperator {
    
    constructor() {
        super("!=", 7);
    }
    
    calculateBoolean(operand1: bigint, operand2: bigint): boolean {
        return (operand1 !== operand2);
    }
}

export class BitwiseAndOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("&", 8);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 & operand2;
    }
}

export class BitwiseXorOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("^", 9);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 ^ operand2;
    }
}

export class BitwiseOrOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("|", 10);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 | operand2;
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
new BinaryOperator(":", 2);
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
new BinaryOperator("=", 14);
new BinaryOperator("+=", 14);
new BinaryOperator("-=", 14);
new BinaryOperator("*=", 14);
new BinaryOperator("/=", 14);
new BinaryOperator("%=", 14);
new BinaryOperator("&=", 14);
new BinaryOperator("^=", 14);
new BinaryOperator("|=", 14);
new BinaryOperator(">>=", 14);
new BinaryOperator("<<=", 14);
new BinaryOperator("&&=", 14);
new BinaryOperator("^^=", 14);
new BinaryOperator("||=", 14);
export const initializationOperator = new InitializationOperator();


