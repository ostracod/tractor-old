
import { Token, WordToken, NumberToken, StringToken, CharacterToken, DelimiterToken, OperatorToken } from "./token.js";
import CompilerError from "./compilerError.js";
import Statement from "./statement.js";
import { NumberConstant, StringConstant } from "./constant.js";
import { Expression, ConstantExpression, IdentifierExpression, UnaryExpression, BinaryExpression } from "./expression.js";
import { unaryOperatorMap, binaryOperatorMap, operatorTextSet } from "./operator.js";

interface TokenResult {
    token: Token;
    index: number;
}

interface ExpressionResult {
    expression: Expression;
    index: number;
}

const delimiterCharacterSet = [",", "(", ")", "[", "]", "{", "}"];
const modifierSet = ["REQUIRE", "FOREIGN", "INLINE", "MAYBE_INLINE"];
const directiveSet = [
    "VAR", "CONST", "FIXED",
    "SCOPE", "END", "IF", "ELSE_IF", "ELSE",
    "WHILE", "BREAK", "CONTINUE",
    "STRUCT", "UNION", "FIELD", "TYPE_FIELD",
    "FUNC_TYPE", "FUNC", "INIT_FUNC",
    "ARG", "RET_TYPE", "RET",
    "IMPORT", "CONFIG_IMPORT", "FOREIGN_IMPORT",
];

const isWhitespaceCharacter = (character: string): boolean => (
    character === " " || character === "\t"
);

const isDigitCharacter = (character: string): boolean => {
    const charCode = character.charCodeAt(0);
    // Digits.
    return (charCode >= 48 && charCode <= 57);
};

const isFirstWordCharacter = (character: string): boolean => {
    if (character === "_") {
        return true;
    }
    const charCode = character.charCodeAt(0);
    // Uppercase letters or lowercase letters.
    return ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122));
};

const isWordCharacter = (character: string): boolean => {
    if (isFirstWordCharacter(character)) {
        return true;
    }
    // Digits.
    return isDigitCharacter(character);
};

const skipCharacters = (
    text: string,
    index: number,
    shouldSkip: (character: string) => boolean,
): number => {
    while (index < text.length) {
        const character = text.charAt(index);
        if (!shouldSkip(character)) {
            break
        }
        index += 1;
    }
    return index;
};

const escapeCharacter = (character: string): string => {
    if (character === "n") {
        return "\n";
    }
    if (character === "t") {
        return "\t";
    }
    return character;
};

const readCharacterToken = (text: string, index: number): TokenResult => {
    // First character is an apostrophe.
    index += 1;
    if (index >= text.length) {
        throw new CompilerError("Expected character.");
    }
    let character = text.charAt(index);
    index += 1;
    if (character === "\\") {
        if (index >= text.length) {
            throw new CompilerError("Expected character.");
        }
        character = escapeCharacter(text.charAt(index));
        index += 1;
    }
    if (index >= text.length || text.charAt(index) !== "'") {
        throw new CompilerError("Expected end apostrophe.");
    }
    index += 1;
    return {
        token: new CharacterToken(character),
        index,
    }
};

const readStringToken = (text: string, index: number): TokenResult => {
    // First character is a quotation mark.
    index += 1;
    const characters = [];
    let isEscaped = false;
    while (true) {
        if (index >= text.length) {
            throw new CompilerError("Missing end quotation mark.");
        }
        const character = text.charAt(index);
        index += 1;
        if (isEscaped) {
            characters.push(escapeCharacter(character));
            isEscaped = false;
        } else {
            if (character === "\"") {
                return {
                    token: new StringToken(characters.join("")),
                    index,
                };
            } else if (character === "\\") {
                isEscaped = true;
            } else {
                characters.push(character);
            }
        }
    }
};

const readOperatorToken = (text: string, index: number): TokenResult => {
    let outputText = null;
    operatorTextSet.forEach((operatorText) => {
        if (outputText !== null && operatorText.length < outputText.length) {
            return;
        }
        const endIndex = index + operatorText.length;
        if (endIndex > text.length) {
            return;
        }
        const tempText = text.substring(index, endIndex);
        if (tempText === operatorText) {
            outputText = operatorText;
        }
    });
    if (outputText === null) {
        return null;
    }
    return {
        token: new OperatorToken(outputText),
        index: index + outputText.length,
    };
};

const readToken = (text: string, index: number): TokenResult => {
    const firstCharacter = text.charAt(index);
    if (isFirstWordCharacter(firstCharacter)) {
        const endIndex = skipCharacters(text, index, isWordCharacter);
        return {
            token: new WordToken(text.substring(index, endIndex)),
            index: endIndex,
        };
    }
    if (isDigitCharacter(firstCharacter)) {
        const endIndex = skipCharacters(text, index, isWordCharacter);
        return {
            token: new NumberToken(text.substring(index, endIndex)),
            index: endIndex,
        };
    }
    if (firstCharacter === "'") {
        return readCharacterToken(text, index);
    }
    if (firstCharacter === "\"") {
        return readStringToken(text, index);
    }
    if (delimiterCharacterSet.includes(firstCharacter)) {
        return {
            token: new DelimiterToken(firstCharacter),
            index: index + 1,
        };
    }
    const result = readOperatorToken(text, index);
    if (result !== null) {
        return result;
    }
    throw new CompilerError(`Unexpected character "${firstCharacter}".`);
};

export const parseLine = (line: string): Token[] => {
    const output: Token[] = [];
    let index = 0;
    while (true) {
        index = skipCharacters(line, index, isWhitespaceCharacter);
        if (index >= line.length) {
            break;
        }
        const character = line.charAt(index);
        if (character === "#") {
            break;
        }
        const result = readToken(line, index);
        output.push(result.token);
        index = result.index;
    }
    return output;
};

const readExpressionHelper = (tokens: Token[], index: number): ExpressionResult => {
    if (index >= tokens.length) {
        return null;
    }
    const token = tokens[index];
    index += 1;
    if (token instanceof OperatorToken && token.text in unaryOperatorMap) {
        const unaryOperator = unaryOperatorMap[token.text];
        const result = readExpression(tokens, index, 1);
        if (result === null) {
            throw new CompilerError(`Expected expression after "${unaryOperator.text}".`);
        }
        return {
            expression: new UnaryExpression(unaryOperator, result.expression),
            index: result.index,
        };
    }
    if (token instanceof NumberToken) {
        // TODO: Handle hexadecimal number tokens.
        const value = BigInt(parseInt(token.text, 10));
        const constant = new NumberConstant(value);
        return {
            expression: new ConstantExpression(constant),
            index,
        };
    }
    if (token instanceof StringToken) {
        const constant = new StringConstant(token.text);
        return {
            expression: new ConstantExpression(constant),
            index,
        };
    }
    if (token instanceof WordToken) {
        return {
            expression: new IdentifierExpression(token.text),
            index,
        };
    }
    // TODO: Read more types of expressions.
    
    return null;
};

const readExpression = (
    tokens: Token[],
    index: number,
    precedence: number,
): ExpressionResult => {
    const result = readExpressionHelper(tokens, index);
    if (result === null) {
        return null;
    }
    let operand1 = result.expression;
    index = result.index;
    let output = {
        expression: operand1,
        index,
    };
    while (true) {
        if (index >= tokens.length) {
            break;
        }
        const token = tokens[index];
        index += 1;
        if (token instanceof OperatorToken) {
            if (!(token.text in binaryOperatorMap)) {
                break;
            }
            const binaryOperator = binaryOperatorMap[token.text];
            if (binaryOperator.precedence >= precedence) {
                break;
            }
            const result = readExpression(tokens, index, binaryOperator.precedence);
            if (result === null) {
                throw new CompilerError(`Expected expression after "${binaryOperator.text}".`);
            }
            const operand2 = result.expression;
            index = result.index;
            operand1 = new BinaryExpression(binaryOperator, operand1, operand2);
            output = {
                expression: operand1,
                index,
            };
        } else {
            // TODO: Handle subscript and invocation expressions.
            break;
        }
    }
    return output;
};

const readExpressions = (
    tokens: Token[],
    index: number,
): { expressions: Expression[], index: number } => {
    const expressions: Expression[] = [];
    while (true) {
        const result = readExpression(tokens, index, Infinity);
        if (result === null) {
            if (expressions.length > 0) {
                throw new CompilerError("Expected expression after comma.");
            }
            break;
        }
        expressions.push(result.expression);
        index = result.index;
        if (index >= tokens.length) {
            break;
        }
        const token = tokens[index];
        if (!(token instanceof DelimiterToken && token.text === ",")) {
            break;
        }
        index += 1;
    }
    return { expressions, index };
};

export const parseTokens = (tokens: Token[]): Statement => {
    const modifiers = [];
    let index = 0;
    while (index < tokens.length) {
        const token = tokens[index];
        if (token instanceof WordToken && modifierSet.includes(token.text)) {
            modifiers.push(token.text);
            index += 1;
        } else {
            break
        }
    }
    let directive = null;
    if (index < tokens.length) {
        const token = tokens[index];
        if (token instanceof WordToken && directiveSet.includes(token.text)) {
            directive = token.text;
            index += 1;
        }
    }
    const result = readExpressions(tokens, index);
    index = result.index;
    if (index < tokens.length) {
        const token = tokens[index];
        throw new CompilerError(`Unexpected token "${token.text}".`);
    }
    return new Statement(modifiers, directive, result.expressions);
};


