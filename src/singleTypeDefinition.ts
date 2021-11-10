
import { Pos } from "./pos.js";
import { IdentifierDefinition } from "./interfaces.js";
import { NodeSlot } from "./node.js";
import { Definition } from "./definition.js";
import { IdentifierBehavior } from "./identifierBehavior.js";
import { Expression } from "./expression.js";
import { TypeResolver } from "./typeResolver.js";

export type SingleTypeDefinitionConstructor<T extends SingleTypeDefinition> = new (
    pos: Pos,
    identifierBehavior: IdentifierBehavior,
    typeExpression: Expression,
) => T;

export abstract class SingleTypeDefinition extends Definition implements IdentifierDefinition {
    identifierBehavior: IdentifierBehavior;
    typeResolver: NodeSlot<TypeResolver>;
    
    constructor(
        pos: Pos,
        identifierBehavior: IdentifierBehavior,
        typeExpression: Expression,
    ) {
        super(pos);
        this.identifierBehavior = identifierBehavior;
        const typeResolver = new TypeResolver(typeExpression);
        this.typeResolver = this.addSlot(typeResolver);
    }
    
    abstract getDefinitionName(): string;
    
    getDisplayLines(): string[] {
        return [`${this.getDefinitionName()} identifier: ${this.identifierBehavior.getDisplayString()}; type: ${this.typeResolver.get().getDisplayString()}`];
    }
}

export abstract class FieldDefinition extends SingleTypeDefinition {
    
    abstract getDefinitionNameHelper(): string;
    
    getDefinitionName(): string {
        return this.getDefinitionNameHelper() + " field";
    }
}

export class DataFieldDefinition extends FieldDefinition {
    
    getDefinitionNameHelper(): string {
        return "Data";
    }
}

export class TypeFieldDefinition extends FieldDefinition {
    
    getDefinitionNameHelper(): string {
        return "Type";
    }
}


