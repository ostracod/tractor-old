
import { Pos } from "./pos.js";
import { NodeSlot } from "./node.js";
import { Definition } from "./definition.js";
import { IdentifierBehavior } from "./identifierBehavior.js";
import { Expression } from "./expression.js";
import { TypeResolver } from "./typeResolver.js";
import { ResolvedFieldConstructor, ResolvedField, DataField, TypeField } from "./resolvedField.js";

export type SingleTypeDefinitionConstructor<T extends SingleTypeDefinition> = new (
    pos: Pos,
    identifierBehavior: IdentifierBehavior,
    typeExpression: Expression,
) => T;

export abstract class SingleTypeDefinition extends Definition {
    typeResolver: NodeSlot<TypeResolver>;
    
    constructor(
        pos: Pos,
        identifierBehavior: IdentifierBehavior,
        typeExpression: Expression,
    ) {
        super(pos, identifierBehavior);
        if (typeExpression === null) {
            this.typeResolver = null;
        } else {
            const typeResolver = new TypeResolver(typeExpression);
            this.setTypeResolver(typeResolver);
        }
    }
    
    abstract getDefinitionName(): string;
    
    setTypeResolver(typeResolver: TypeResolver): void {
        this.typeResolver = this.addSlot(typeResolver);
    }
    
    getDisplayLine(): string {
        return `${this.getDefinitionName()} identifier: ${this.identifierBehavior.getDisplayString()}; type: ${this.typeResolver.get().getDisplayString()}`;
    }
    
    getDisplayLines(): string[] {
        return [this.getDisplayLine()];
    }
}

export abstract class FieldDefinition extends SingleTypeDefinition {
    
    abstract getDefinitionNameHelper(): string;
    
    abstract getResolvedFieldConstructor(): ResolvedFieldConstructor;
    
    getDefinitionName(): string {
        return this.getDefinitionNameHelper() + " field";
    }
    
    resolve(): ResolvedField {
        const { type } = this.typeResolver.get();
        if (type === null) {
            return null;
        }
        const name = this.identifierBehavior.identifier.getFieldNameString();
        const fieldConstructor = this.getResolvedFieldConstructor();
        return new fieldConstructor(name, type);
    }
}

export class DataFieldDefinition extends FieldDefinition {
    
    getDefinitionNameHelper(): string {
        return "Data";
    }
    
    getResolvedFieldConstructor(): ResolvedFieldConstructor {
        return DataField;
    }
}

export class TypeFieldDefinition extends FieldDefinition {
    
    getDefinitionNameHelper(): string {
        return "Type";
    }
    
    getResolvedFieldConstructor(): ResolvedFieldConstructor {
        return TypeField;
    }
}


