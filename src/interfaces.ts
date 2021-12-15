
import { ItemType } from "./compItem/itemType.js";

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


