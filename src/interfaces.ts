
import { Identifier } from "./identifier.js";

export interface Config {
    name: string;
    description: string;
    isDefault?: boolean;
    importMap?: {[name: string]: string};
    targetLanguage?: string;
    buildFileName?: string;
    configs?: Config[];
}

export interface Displayable {
    getDisplayString(): string;
}

export interface IdentifierDefinition {
    identifier: Identifier;
}


