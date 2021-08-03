
import { Displayable, IdentifierDefinition } from "./interfaces.js";
import { Identifier } from "./identifier.js";
import { Expression } from "./expression.js";

export abstract class VariableDefinition implements Displayable, IdentifierDefinition {
    identifier: Identifier;
    typeExpression: Expression;
    
    constructor(identifier: Identifier, typeExpression: Expression) {
        this.identifier = identifier;
        this.typeExpression = typeExpression;
    }
    
    abstract getDisplayStringHelper(): string;
    
    getDisplayString(): string {
        return `${this.getDisplayStringHelper()} ${this.identifier.getDisplayString()}, ${this.typeExpression.getDisplayString()}`;
    }
}

export class ArgVariableDefinition extends VariableDefinition {
    
    getDisplayStringHelper(): string {
        return "ARG";
    }
}


