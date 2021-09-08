
import { Displayable } from "./interfaces.js";

export const extendList = (destination: any[], source: any[]): void => {
    source.forEach((element) => {
        destination.push(element);
    });
};

export const extendSet = (destination: Set<any>, source: Set<any>): void => {
    source.forEach((element) => {
        destination.add(element);
    });
};

export const getWithDefault = <T>(
    valueMap: { [name: string]: any },
    name: string,
    defaultValue: T,
): T => {
    const value = valueMap[name];
    return (typeof value === "undefined") ? defaultValue : value;
};

export const getDictionaryWithDefaults = (
    dictionary: {[key: string]: any},
    defaultValueMap: {[key: string]: any},
): {[key: string]: any} => {
    const output: {[key: string]: any} = {};
    for (const key in dictionary) {
        output[key] = dictionary[key];
    }
    for (const key in defaultValueMap) {
        if (!(key in output)) {
            output[key] = defaultValueMap[key];
        }
    }
    return output;
};

export const getNumberPhrase = (amount: number, noun: string): string => {
    return (amount === 1) ? `${amount} ${noun}` : `${amount} ${noun}s`;
};

export const getIndentation = (indentationLevel: number): string => {
    const textList = [];
    for (let count = 0; count < indentationLevel; count++) {
        textList.push("    ");
    }
    return textList.join("");
};

export const extendWithIndentation = (destination: string[], source: string[]): void => {
    const indentation = getIndentation(1);
    source.forEach((text) => {
        destination.push(indentation + text);
    });
}

export const getDisplayStrings = (title: string, displayables: Displayable[]): string => {
    const lines = [`\n= = = ${title} = = =\n`];
    displayables.forEach((displayable) => {
        lines.push(displayable.getDisplayString());
    });
    return lines.join("\n");
};


