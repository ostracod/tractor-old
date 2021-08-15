
import { IdentifierDefinition } from "./interfaces.js";
import { Node, NodeSlot } from "./node.js";
import { Identifier } from "./identifier.js";
import { Expression } from "./expression.js";
import { SingleTypeDefinition } from "./typeDefinition.js";
import { TypeResolver } from "./typeResolver.js";

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
}

export class CompVariableDefinition extends VariableDefinition {
    
    getDefinitionNameHelper(): string {
        return "Compile-time";
    }
}

export class FixedVariableDefinition extends VariableDefinition {
    
    getDefinitionNameHelper(): string {
        return "Fixed";
    }
}

export class SoftVariableDefinition extends VariableDefinition {
    
    getDefinitionNameHelper(): string {
        return "Soft";
    }
}


