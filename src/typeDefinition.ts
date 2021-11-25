
import { ResolvedField } from "./interfaces.js";
import { Pos } from "./pos.js";
import * as niceUtils from "./niceUtils.js";
import { NodeSlot } from "./node.js";
import { Definition } from "./definition.js";
import { FieldDefinition } from "./singleTypeDefinition.js";
import { IdentifierBehavior } from "./identifierBehavior.js";
import { DefinitionMap } from "./definitionMap.js";
import { StatementBlock } from "./statementBlock.js";
import { DefinitionFunctionSignature } from "./functionSignature.js";
import { FieldsTypeConstructor, FieldsType, StructType, UnionType } from "./itemType.js";

export type FieldsTypeDefinitionConstructor<T extends FieldsTypeDefinition> = new (
    pos: Pos,
    identifierBehavior: IdentifierBehavior,
    fields: FieldDefinition[],
) => T;

export abstract class FieldsTypeDefinition<T extends FieldsType = FieldsType> extends Definition {
    fieldMap: NodeSlot<DefinitionMap<FieldDefinition>>;
    
    constructor(
        pos: Pos,
        identifierBehavior: IdentifierBehavior,
        fields: FieldDefinition[],
    ) {
        super(pos, identifierBehavior);
        const fieldMap = new DefinitionMap<FieldDefinition>(fields);
        this.fieldMap = this.addSlot(fieldMap);
    }
    
    abstract getDefinitionName(): string;
    
    abstract getFieldsTypeConstructor(): FieldsTypeConstructor<T>;
    
    getCompItemOrNull(): T {
        const fields: ResolvedField[] = [];
        let hasUnresolvedField = false;
        this.fieldMap.get().iterate((definition) => {
            const { type } = definition.typeResolver.get();
            if (type === null) {
                hasUnresolvedField = true;
            } else {
                const { identifier } = definition.identifierBehavior;
                const name = identifier.getFieldNameString();
                fields.push({ name, type });
            }
        });
        if (hasUnresolvedField) {
            return null;
        }
        const fieldsTypeConstructor = this.getFieldsTypeConstructor();
        const name = this.identifierBehavior.getDisplayString();
        return new fieldsTypeConstructor(name, fields);
    }
    
    getDisplayLines(): string[] {
        const output = [`${this.getDefinitionName()} identifier: ${this.identifierBehavior.getDisplayString()}`];
        this.fieldMap.get().iterate((definition) => {
            niceUtils.extendWithIndentation(output, definition.getDisplayLines());
        });
        return output;
    }
}

export class StructDefinition extends FieldsTypeDefinition<StructType> {
    
    getDefinitionName(): string {
        return "Struct";
    }
    
    getFieldsTypeConstructor(): FieldsTypeConstructor<StructType> {
        return StructType;
    }
}

export class UnionDefinition extends FieldsTypeDefinition<UnionType> {
    
    getDefinitionName(): string {
        return "Union";
    }
    
    getFieldsTypeConstructor(): FieldsTypeConstructor<UnionType> {
        return UnionType;
    }
}

export class FunctionTypeDefinition extends Definition {
    block: NodeSlot<StatementBlock>;
    signature: DefinitionFunctionSignature;
    
    constructor(pos: Pos, identifierBehavior: IdentifierBehavior, block: StatementBlock) {
        super(pos, identifierBehavior);
        this.block = this.addSlot(block);
        this.signature = this.block.get().createFunctionSignature();
    }
    
    getDisplayLines(): string[] {
        const output = [`Function type identifier: ${this.identifierBehavior.getDisplayString()}`];
        const returnTypeLines = this.signature.getReturnTypeDisplayLines();
        niceUtils.extendWithIndentation(output, returnTypeLines);
        niceUtils.extendWithIndentation(output, this.block.get().getDisplayLines());
        return output;
    }
}


