
import { IdentifierDefinition } from "./interfaces.js";
import { Node, NodeSlot } from "./node.js";
import { Identifier } from "./identifier.js";
import { IdentifierDefinitionMap } from "./identifierDefinitionMap.js";
import { Expression } from "./expression.js";
import { TypeResolver } from "./typeResolver.js";

export abstract class TypeDefinition extends Node implements IdentifierDefinition {
    identifier: Identifier;
    
    constructor(identifier: Identifier) {
        super();
        this.identifier = identifier;
    }
}

export abstract class SingleTypeDefinition extends TypeDefinition {
    typeResolver: NodeSlot<TypeResolver>;
    
    constructor(identifier: Identifier, typeExpression: Expression) {
        super(identifier);
        const typeResolver = new TypeResolver(typeExpression);
        this.typeResolver = this.addSlot(typeResolver);
    }
    
    abstract getDefinitionName(): string;
    
    getDisplayString(): string {
        return `${this.getDefinitionName()} identifier: ${this.identifier.getDisplayString()}; type: ${this.typeResolver.get().getDisplayString()}`;
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

export abstract class FieldsTypeDefinition extends TypeDefinition {
    fieldMap: NodeSlot<IdentifierDefinitionMap<FieldDefinition>>;
    
    constructor(identifier: Identifier, fields: FieldDefinition[]) {
        super(identifier);
        const fieldMap = new IdentifierDefinitionMap<FieldDefinition>(fields);
        this.fieldMap = this.addSlot(fieldMap);
    }
    
    abstract getDefinitionName(): string;
    
    getDisplayString(): string {
        const textList = [];
        this.fieldMap.get().iterate((definition) => {
            textList.push("   " + definition.getDisplayString())
        });
        return `${this.getDefinitionName()} identifier: ${this.identifier.getDisplayString()}${textList.join("")}`;
    }
}

export class StructDefinition extends FieldsTypeDefinition {
    
    getDefinitionName(): string {
        return "Struct";
    }
}

