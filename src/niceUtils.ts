
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

export const getIndentation = (indentationLevel: number): string => {
    const textList = [];
    for (let count = 0; count < indentationLevel; count++) {
        textList.push("    ");
    }
    return textList.join("");
};


