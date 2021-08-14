
import { IdentifierDefinition } from "./interfaces.js";
import { Node, NodeSlot } from "./node.js";
import { Identifier } from "./identifier.js";
import { TypeResolver } from "./typeResolver.js";

export abstract class VariableDefinition extends Node implements IdentifierDefinition {
    identifier: Identifier;
    typeResolver: NodeSlot<TypeResolver>;
    
    constructor(identifier: Identifier, typeResolver: TypeResolver) {
        super();
        this.identifier = identifier;
        this.typeResolver = this.addSlot(typeResolver);
    }
    
    abstract getDisplayStringHelper(): string;
    
    getDisplayString(): string {
        return `${this.getDisplayStringHelper()} variable name: ${this.identifier.getDisplayString()}; type: ${this.typeResolver.get().getDisplayString()}`;
    }
}

export class ArgVariableDefinition extends VariableDefinition {
    
    getDisplayStringHelper(): string {
        return "Arg";
    }
}


