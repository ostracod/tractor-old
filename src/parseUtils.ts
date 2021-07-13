
import { Token, WordToken, NumberToken, StringToken, CharacterToken, DelimiterToken, OperatorToken } from "./token.js";
import CompilerError from "./compilerError.js";
import { Statement } from "./statement.js";

interface TokenResult {
    token: Token;
    index: number;
}

const delimiterCharacterSet = [",", "(", ")", "[", "]", "{", "}"];
const operatorTextSet = [
    "+", "-", "*", "/", "%",
    "~", "&", "|", "^", ">>", "<<",
    "!", "&&", "||", "^^",
    "==", "!=", ">", ">=", "<", "<=",
    ":", "=",
    "+=", "-=", "*=", "/=", "%=",
    "&=", "|=", "^=", ">>=", "<<=",
    "&&=", "||=", "^^=",
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

export const parseTokens = (tokens: Token[]): Statement => {
    // TODO: Implement.
    return new Statement();
};


