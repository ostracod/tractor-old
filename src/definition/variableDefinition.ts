
import { IdentifierBehavior } from "../identifierBehavior.js";
import { Pos } from "../parse/pos.js";
import { Expression } from "../statement/expression.js";
import { CompItem, CompUnknown, CompKnown } from "../compItem/compItem.js";
import { CompValue } from "../compItem/compValue.js";
import { ItemType } from "../compItem/itemType.js";
import { StorageType, FrameType, CompType, FixedType, CompLocationType } from "../compItem/storageType.js";
import { AndType } from "../compItem/manipulationType.js";
import { SingleTypeDefinition } from "./singleTypeDefinition.js";

export abstract class VariableDefinition extends SingleTypeDefinition {
    
    abstract getDefinitionNameHelper(): string;
    
    getStorageType(): ItemType {
        return new AndType(new FrameType(), new CompLocationType());
    }
    
    getResolvedType(): ItemType {
        const constraintType = this.typeResolver.get().type;
        if (constraintType === null) {
            return null;
        }
        const storageType = this.getStorageType();
        if (storageType === null) {
            return null;
        }
        return constraintType.intersectType(storageType);
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
    hasInitExpression: boolean;
    initItem: CompKnown;
    initItemType: ItemType;
    resolvedType: ItemType;
    
    constructor(
        pos: Pos,
        identifierBehavior: IdentifierBehavior,
        typeExpression: Expression,
    ) {
        super(pos, identifierBehavior, typeExpression);
        this.hasInitExpression = null;
        this.initItem = null;
        this.initItemType = null;
        this.resolvedType = null;
    }
    
    getResolvedType(): ItemType {
        if (this.resolvedType === null) {
            if (this.hasInitExpression === null) {
                return null;
            }
            const type1 = super.getResolvedType();
            if (type1 === null) {
                return null;
            }
            if (!this.hasInitExpression) {
                return type1;
            }
            if (this.initItemType === null) {
                return null;
            }
            const type2 = this.initItemType.stripStorageTypes();
            this.resolvedType = type1.intersectType(type2);
            if (this.resolvedType === null) {
                throw this.createError("Init item is incompatible with variable type.");
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
    
    // Excludes compT.
    getStorageTypesHelper(): StorageType[] {
        return [];
    }
    
    getCompItemOrNull(): CompItem {
        const { initItem } = this;
        if (initItem === null) {
            return super.getCompItemOrNull();
        } else if (initItem instanceof CompValue) {
            const output = initItem.copy();
            output.setTypeStorageTypes(this.getStorageTypesHelper());
            return output;
        } else {
            return initItem;
        }
    }
    
    getDefinitionNameHelper(): string {
        return "Compile-time";
    }
    
    getStorageType(): ItemType {
        return (this.getStorageTypesHelper() as ItemType[]).reduce((accumulator, type) => (
            new AndType(accumulator, type)
        ), new CompType());
    }
}

export class FixedVariableDefinition extends CompVariableDefinition {
    
    getDefinitionNameHelper(): string {
        return "Fixed";
    }
    
    getStorageTypesHelper(): StorageType[] {
        return [new FixedType(), new CompLocationType()];
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
    
    getStorageType(): ItemType {
        return null;
    }
}


