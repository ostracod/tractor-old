
import { IdentifierBehavior } from "../identifierBehavior.js";
import { Pos } from "../parse/pos.js";
import { Expression } from "../statement/expression.js";
import { CompItem, CompUnknown, CompKnown } from "../compItem/compItem.js";
import { SingleTypeDefinition } from "./singleTypeDefinition.js";

export abstract class VariableDefinition extends SingleTypeDefinition {
    
    abstract getDefinitionNameHelper(): string;
    
    getCompItemOrNull(): CompItem {
        const constraintType = this.typeResolver.get().type;
        // TODO: Intersect constraintType with variable
        // storage type and init item type.
        return (constraintType === null) ? null : new CompUnknown(constraintType);
    }
    
    // Returns whether the expression has been handled.
    handleInitExpression(expression: Expression): boolean {
        return false;
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

export class FrameVariableDefinition extends VariableDefinition {
    
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

export class CompVariableDefinition extends VariableDefinition {
    item: CompKnown;
    
    constructor(
        pos: Pos,
        identifierBehavior: IdentifierBehavior,
        typeExpression: Expression,
    ) {
        super(pos, identifierBehavior, typeExpression);
        this.item = null;
    }
    
    getCompItemOrNull(): CompItem {
        return this.item;
    }
    
    handleInitExpression(expression: Expression): boolean {
        const compItem = expression.evaluateToCompItemOrNull();
        if (!(compItem instanceof CompKnown)) {
            return false;
        }
        this.item = compItem;
        return true;
    }
    
    getDisplayLine(): string {
        let output = super.getDisplayLine();
        if (this.item !== null) {
            output += `; item: ${this.item.getDisplayString()}`;
        }
        return output;
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

export class AutoVariableDefinition extends VariableDefinition {
    
    handleInitExpression(expression: Expression): boolean {
        const compItem = expression.evaluateToCompItemOrNull();
        if (compItem instanceof CompKnown) {
            const definition = new CompVariableDefinition(
                this.pos,
                this.identifierBehavior,
                null,
            );
            definition.setTypeResolver(this.typeResolver.get());
            definition.item = compItem;
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


