
import { Pos } from "./pos.js";
import * as niceUtils from "./niceUtils.js";
import { NodeSlot } from "./node.js";
import { Definition } from "./definition.js";
import { FieldDefinition } from "./singleTypeDefinition.js";
import { IdentifierBehavior } from "./identifierBehavior.js";
import { DefinitionMap } from "./definitionMap.js";
import { StatementBlock } from "./statementBlock.js";
import { FunctionSignature } from "./functionSignature.js";

export type FieldsTypeDefinitionConstructor<T extends FieldsTypeDefinition> = new (
    pos: Pos,
    identifierBehavior: IdentifierBehavior,
    fields: FieldDefinition[],
) => T;

export abstract class FieldsTypeDefinition extends Definition {
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
    
    getDisplayLines(): string[] {
        const output = [`${this.getDefinitionName()} identifier: ${this.identifierBehavior.getDisplayString()}`];
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

export class FunctionTypeDefinition extends Definition {
    block: NodeSlot<StatementBlock>;
    signature: NodeSlot<FunctionSignature>;
    
    constructor(pos: Pos, identifierBehavior: IdentifierBehavior, block: StatementBlock) {
        super(pos, identifierBehavior);
        this.block = this.addSlot(block);
        const signature = this.block.get().createFunctionSignature();
        this.signature = this.addSlot(signature);
    }
    
    getDisplayLines(): string[] {
        const output = [`Function type identifier: ${this.identifierBehavior.getDisplayString()}`];
        const returnTypeLines = this.signature.get().getReturnTypeDisplayLines();
        niceUtils.extendWithIndentation(output, returnTypeLines);
        niceUtils.extendWithIndentation(output, this.block.get().getDisplayLines());
        return output;
    }
}


