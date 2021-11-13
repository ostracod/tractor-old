
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

new UnaryOperator("-");
new UnaryOperator("~");
new UnaryOperator("!");

new BinaryOperator(".", 0);
new BinaryOperator(":", 2);
new BinaryOperator("*", 3);
new BinaryOperator("/", 3);
new BinaryOperator("%", 3);
new BinaryOperator("+", 4);
new BinaryOperator("-", 4);
new BinaryOperator(">>", 5);
new BinaryOperator("<<", 5);
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


