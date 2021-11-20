
import * as niceUtils from "./niceUtils.js";
import { Node, NodeSlot } from "./node.js";
import { ArgVariableDefinition } from "./variableDefinition.js";
import { TypeResolver } from "./typeResolver.js";

export class FunctionSignature extends Node {
    // argVariableDefinitions and returnTypeResolver are weak references.
    argVariableDefinitions: NodeSlot<ArgVariableDefinition>[];
    returnTypeResolver: NodeSlot<TypeResolver>;
    
    constructor(
        argVariableDefinitions: NodeSlot<ArgVariableDefinition>[],
        returnTypeResolver: NodeSlot<TypeResolver>,
    ) {
        super();
        this.argVariableDefinitions = argVariableDefinitions;
        this.returnTypeResolver = returnTypeResolver;
    }
    
    getReturnTypeDisplayLines(): string[] {
        const returnTypeResolver = this.returnTypeResolver.get();
        if (returnTypeResolver === null) {
            return [];
        }
        const returnTypeText = returnTypeResolver.getDisplayString();
        return ["Return type: " + returnTypeText];
    }
    
    getDisplayLines(): string[] {
        const output = [];
        this.argVariableDefinitions.forEach((slot) => {
            niceUtils.extendList(output, slot.get().getDisplayLines());
        });
        niceUtils.extendList(output, this.getReturnTypeDisplayLines());
        return output;
    }
    
    getDisplayString(): string {
        return this.getDisplayLines().join("\n");
    }
}


