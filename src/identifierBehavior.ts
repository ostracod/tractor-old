
import { Displayable } from "./interfaces.js";
import { Identifier } from "./identifier.js";

export class IdentifierBehavior implements Displayable {
    identifier: Identifier;
    
    constructor(identifier: Identifier) {
        this.identifier = identifier;
    }
    
    shouldConvertDefinitionToCode(): boolean {
        return true;
    }
    
    getDisplayString(): string {
        return this.identifier.getDisplayString();
    }
    
    getCodeString(): string {
        return this.identifier.getCodeString();
    }
}

export class ForeignIdentifierBehavior extends IdentifierBehavior {
    
    shouldConvertDefinitionToCode(): boolean {
        return false;
    }
    
    getDisplayString(): string {
        return "#foreign_" + super.getDisplayString();
    }
    
    getCodeString(): string {
        return this.identifier.getForeignCodeString();
    }
}


