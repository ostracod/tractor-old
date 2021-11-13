
import { Pos } from "./pos.js";
import { IdentifierDefinition } from "./interfaces.js";
import { Node, NodeSlot } from "./node.js";
import { Identifier } from "./identifier.js";
import { IdentifierBehavior } from "./identifierBehavior.js";
import { Expression } from "./expression.js";
import { SingleTypeDefinition } from "./singleTypeDefinition.js";
import { CompItem } from "./compItem.js";

export abstract class VariableDefinition extends SingleTypeDefinition {
    
    abstract getDefinitionNameHelper(): string;
    
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
    item: CompItem;
    
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
    
    getDefinitionNameHelper(): string {
        return "Auto";
    }
}


