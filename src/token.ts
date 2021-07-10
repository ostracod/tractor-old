
export abstract class Token {
    text: string;
    
    constructor(text: string) {
        this.text = text;
    }
}

export class WordToken extends Token {
    
}

export class NumberToken extends Token {
    
}

export class StringToken extends Token {
    
}

export class CharacterToken extends Token {
    
}

export class DelimiterToken extends Token {
    
}

export class OperatorToken extends Token {
    
}


