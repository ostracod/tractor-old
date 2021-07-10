
import { Token, WordToken, NumberToken, StringToken, CharacterToken, DelimiterToken, OperatorToken } from "./token.js";
import { Statement } from "./statement.js";

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

const readStringToken = (text: string, index: number): { token: Token, index: number } => {
    // First character is a quotation mark.
    index += 1;
    const startIndex = index;
    while (true) {
        if (index >= text.length) {
            // TODO: Throw an informative error.
            return null;
        }
        const character = text.charAt(index);
        const nextIndex = index + 1;
        // TODO: Handle escape sequences.
        if (character === "\"") {
            return {
                token: new StringToken(text.substring(startIndex, index)),
                index: nextIndex,
            };
        }
        index = nextIndex;
    }
};

const readOperatorToken = (text: string, index: number): { token: Token, index: number } => {
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

const readToken = (text: string, index: number): { token: Token, index: number } => {
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
    if (firstCharacter === "\"") {
        return readStringToken(text, index);
    }
    // TODO: Parse character token.
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
    // TODO: Throw an informative error.
    return null;
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
    return null;
};


