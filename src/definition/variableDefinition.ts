
import { IdentifierBehavior } from "../identifierBehavior.js";
import { Pos } from "../parse/pos.js";
import { Expression } from "../statement/expression.js";
import { CompItem, CompUnknown, CompKnown } from "../compItem/compItem.js";
import { ItemType } from "../compItem/itemType.js";
import { SingleTypeDefinition } from "./singleTypeDefinition.js";

export abstract class VariableDefinition extends SingleTypeDefinition {
    
    abstract getDefinitionNameHelper(): string;
    
    getResolvedType(): ItemType {
        return this.typeResolver.get().type;
    }
    
    getCompItemOrNull(): CompItem {
        const type = this.getResolvedType();
        return (type === null) ? null : new CompUnknown(type);
    }
    
    getDefinitionName(): string {
        return this.getDefinitionNameHelper() + " variable";
    }
}

export class ArgVariableDefinition extends VariableDefinition {
    
    getDefinitionNameHelper(): string {
        return "Arg";
    }
}

export abstract class InitableVariableDefinition extends VariableDefinition {
    initItem: CompKnown;
    initItemType: ItemType;
    resolvedType: ItemType;
    
    constructor(
        pos: Pos,
        identifierBehavior: IdentifierBehavior,
        typeExpression: Expression,
    ) {
        super(pos, identifierBehavior, typeExpression);
        this.initItem = null;
        this.initItemType = null;
        this.resolvedType = null;
    }
    
    getResolvedType(): ItemType {
        if (this.resolvedType === null) {
            if (this.initItemType === null) {
                return null;
            }
            const constraintType = super.getResolvedType();
            if (constraintType === null) {
                return null;
            }
            const strippedType = this.initItemType.stripStorageTypes();
            this.resolvedType = constraintType.intersectType(strippedType);
            if (this.resolvedType === null) {
                throw this.createError("Variable init item is incompatible with constraint type.");
            }
        }
        return this.resolvedType;
    }
    
    handleInitItem(item: CompItem): void {
        this.initItemType = item.getType();
        if (item instanceof CompKnown) {
            this.initItem = item;
        }
    }
    
    // Returns whether the expression has been handled.
    handleInitExpression(expression: Expression): boolean {
        const compItem = expression.evaluateToCompItemOrNull();
        if (compItem !== null) {
            this.handleInitItem(compItem);
        }
        return (this.initItem !== null);
    }
    
    getDisplayLine(): string {
        let output = super.getDisplayLine();
        if (this.initItem !== null) {
            output += `; init item: ${this.initItem.getDisplayString()}`;
        }
        return output;
    }
}

export class FrameVariableDefinition extends InitableVariableDefinition {
    
    getDefinitionNameHelper(): string {
        return "Frame";
    }
    
    convertToUnixC(): string {
        const tempType = this.typeResolver.get().getType();
        let typeText: string;
        this.tryOperation(() => {
            typeText = tempType.convertToUnixC();
        });
        const identifierText = this.identifierBehavior.getCodeString();
        return `${typeText} ${identifierText};`;
    }
}

export class CompVariableDefinition extends InitableVariableDefinition {
    
    getCompItemOrNull(): CompItem {
        return (this.initItem === null) ? super.getCompItemOrNull() : this.initItem;
    }
    
    getDefinitionNameHelper(): string {
        return "Compile-time";
    }
}

export class FixedVariableDefinition extends CompVariableDefinition {
    
    getDefinitionNameHelper(): string {
        return "Fixed";
    }
}

export class AutoVariableDefinition extends InitableVariableDefinition {
    
    handleInitExpression(expression: Expression): boolean {
        const compItem = expression.evaluateToCompItemOrNull();
        if (compItem instanceof CompKnown) {
            const definition = new CompVariableDefinition(
                this.pos,
                this.identifierBehavior,
                null,
            );
            definition.setTypeResolver(this.typeResolver.get());
            definition.handleInitItem(compItem);
            const block = this.getParentBlock();
            block.removeDefinition(this.identifierBehavior.identifier);
            block.addDefinition(definition);
            return true;
        }
        // TODO: Handle other initialization cases.
        
        return false;
    }
    
    getDefinitionNameHelper(): string {
        return "Auto";
    }
}


