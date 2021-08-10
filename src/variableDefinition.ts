
import { IdentifierDefinition } from "./interfaces.js";
import { Node, NodeSlot } from "./node.js";
import { Identifier } from "./identifier.js";
import { Expression } from "./expression.js";

export abstract class VariableDefinition extends Node implements IdentifierDefinition {
    identifier: Identifier;
    typeExpression: NodeSlot<Expression>;
    
    constructor(identifier: Identifier, typeExpression: Expression) {
        super();
        this.identifier = identifier;
        this.typeExpression = this.addSlot(typeExpression);
    }
    
    abstract getDisplayStringHelper(): string;
    
    getDisplayString(): string {
        return `${this.getDisplayStringHelper()} ${this.identifier.getDisplayString()}, ${this.typeExpression.get().getDisplayString()}`;
    }
}

export class ArgVariableDefinition extends VariableDefinition {
    
    getDisplayStringHelper(): string {
        return "ARG";
    }
}


