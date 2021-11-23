
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

export class UnaryOperator extends Operator {
    
    constructor(text: string) {
        super(text);
        unaryOperatorMap[this.text] = this;
    }
    
    generateUnixC(operand: Expression) {
        return `(${this.getUnixCText()} ${operand.convertToUnixC()})`;
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

export abstract class BinaryArithmeticOperator extends BinaryIntegerOperator {
    
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

export class MultiplicationOperator extends BinaryArithmeticOperator {
    
    constructor() {
        super("*", 3);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 * operand2;
    }
}

export class DivisionOperator extends BinaryArithmeticOperator {
    
    constructor() {
        super("/", 3);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 * operand2;
    }
}

export class ModulusOperator extends BinaryArithmeticOperator {
    
    constructor() {
        super("%", 3);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 * operand2;
    }
}

export class AdditionOperator extends BinaryArithmeticOperator {
    
    constructor() {
        super("+", 4);
    }
    
    calculateInteger(operand1: bigint, operand2: bigint): bigint {
        return operand1 + operand2;
    }
}

export class SubtractionOperator extends BinaryArithmeticOperator {
    
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

new UnaryOperator("-");
new UnaryOperator("~");
new UnaryOperator("!");

new BinaryOperator(".", 0);
new BinaryOperator(":", 2);
new MultiplicationOperator();
new DivisionOperator();
new ModulusOperator();
new AdditionOperator();
new SubtractionOperator();
new BitshiftRightOperator();
new BitshiftLeftOperator();
new BinaryOperator(">", 6);
new BinaryOperator(">=", 6);
new BinaryOperator("<", 6);
new BinaryOperator("<=", 6);
new BinaryOperator("==", 7);
new BinaryOperator("!=", 7);
new BinaryOperator("&", 8);
new BinaryOperator("^", 9);
new BinaryOperator("|", 10);
new BinaryOperator("&&", 11);
new BinaryOperator("^^", 12);
new BinaryOperator("||", 13);
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


