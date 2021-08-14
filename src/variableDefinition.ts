
import { IdentifierDefinition } from "./interfaces.js";
import { Node, NodeSlot } from "./node.js";
import { Identifier } from "./identifier.js";
import { Expression } from "./expression.js";
import { TypeResolver } from "./typeResolver.js";

export type VariableDefinitionConstructor<T extends VariableDefinition> = new (
    identifier: Identifier,
    typeExpression: Expression,
) => T;

export abstract class VariableDefinition extends Node implements IdentifierDefinition {
    identifier: Identifier;
    typeResolver: NodeSlot<TypeResolver>;
    
    constructor(identifier: Identifier, typeExpression: Expression) {
        super();
        this.identifier = identifier;
        const typeResolver = new TypeResolver(typeExpression);
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

export class FrameVariableDefinition extends VariableDefinition {
    
    getDisplayStringHelper(): string {
        return "Frame";
    }
}

export class CompVariableDefinition extends VariableDefinition {
    
    getDisplayStringHelper(): string {
        return "Compile-time";
    }
}

export class FixedVariableDefinition extends VariableDefinition {
    
    getDisplayStringHelper(): string {
        return "Fixed";
    }
}

export class SoftVariableDefinition extends VariableDefinition {
    
    getDisplayStringHelper(): string {
        return "Soft";
    }
}


