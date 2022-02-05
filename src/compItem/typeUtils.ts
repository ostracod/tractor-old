
import { BasicType } from "./basicType.js";
import { StorageType } from "./storageType.js";

export const mergeBasicTypes = (types: BasicType[]): BasicType[] => {
    // TODO: Implement.
    return types;
};

export const mergeStorageTypes = (types: StorageType[]): StorageType[] => {
    const output: StorageType[] = [];
    for (let index1 = 0; index1 < types.length; index1++) {
        const type1 = types[index1];
        let typeIsRedundant = false;
        for (let index2 = 0; index2 < types.length; index2++) {
            if (index1 === index2) {
                continue;
            }
            const type2 = types[index2];
            if (type1.containsStorageType(type2)) {
                typeIsRedundant = true;
                break;
            }
            if (!type1.intersectsStorageType(type2)) {
                return null;
            }
        }
        if (!typeIsRedundant) {
            output.push(type1);
        }
    }
    return output;
};


