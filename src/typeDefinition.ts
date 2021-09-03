
import { Pos } from "./pos.js";
import { IdentifierDefinition } from "./interfaces.js";
import * as niceUtils from "./niceUtils.js";
import { NodeSlot } from "./node.js";
import { Definition } from "./definition.js";
import { Identifier } from "./identifier.js";
import { IdentifierDefinitionMap } from "./identifierDefinitionMap.js";
import { Expression } from "./expression.js";
import { TypeResolver } from "./typeResolver.js";
import { StatementBlock } from "./statementBlock.js";
import { FunctionSignature } from "./functionSignature.js";

export abstract class TypeDefinition extends Definition implements IdentifierDefinition {
    identifier: Identifier;
    
    constructor(pos: Pos, identifier: Identifier) {
        super(pos);
        this.identifier = identifier;
    }
}

export type SingleTypeDefinitionConstructor<T extends SingleTypeDefinition> = new (
    pos: Pos,
    identifier: Identifier,
    typeExpression: Expression,
) => T;

export abstract class SingleTypeDefinition extends TypeDefinition {
    typeResolver: NodeSlot<TypeResolver>;
    
    constructor(pos: Pos, identifier: Identifier, typeExpression: Expression) {
        super(pos, identifier);
        const typeResolver = new TypeResolver(typeExpression);
        this.typeResolver = this.addSlot(typeResolver);
    }
    
    abstract getDefinitionName(): string;
    
    getDisplayLines(): string[] {
        return [`${this.getDefinitionName()} identifier: ${this.identifier.getDisplayString()}; type: ${this.typeResolver.get().getDisplayString()}`];
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

export type FieldsTypeDefinitionConstructor<T extends FieldsTypeDefinition> = new (
    pos: Pos,
    identifier: Identifier,
    fields: FieldDefinition[],
) => T;

export abstract class FieldsTypeDefinition extends TypeDefinition {
    fieldMap: NodeSlot<IdentifierDefinitionMap<FieldDefinition>>;
    
    constructor(pos: Pos, identifier: Identifier, fields: FieldDefinition[]) {
        super(pos, identifier);
        const fieldMap = new IdentifierDefinitionMap<FieldDefinition>(fields);
        this.fieldMap = this.addSlot(fieldMap);
    }
    
    abstract getDefinitionName(): string;
    
    getDisplayLines(): string[] {
        const output = [`${this.getDefinitionName()} identifier: ${this.identifier.getDisplayString()}`];
        this.fieldMap.get().iterate((definition) => {
            niceUtils.extendWithIndentation(output, definition.getDisplayLines());
        });
        return output;
    }
}

export class StructDefinition extends FieldsTypeDefinition {
    
    getDefinitionName(): string {
        return "Struct";
    }
}

export class UnionDefinition extends FieldsTypeDefinition {
    
    getDefinitionName(): string {
        return "Union";
    }
}

export class FunctionTypeDefinition extends TypeDefinition {
    block: NodeSlot<StatementBlock>;
    signature: NodeSlot<FunctionSignature>;
    
    constructor(pos: Pos, identifier: Identifier, block: StatementBlock) {
        super(pos, identifier);
        this.block = this.addSlot(block);
        const signature = this.block.get().createFunctionSignature();
        this.signature = this.addSlot(signature);
    }
    
    getDisplayLines(): string[] {
        const output = [`Function type identifier: ${this.identifier.getDisplayString()}`];
        const returnTypeLines = this.signature.get().getReturnTypeDisplayLines();
        niceUtils.extendWithIndentation(output, returnTypeLines);
        niceUtils.extendWithIndentation(output, this.block.get().getDisplayLines());
        return output;
    }
}


