
import * as niceUtils from "../niceUtils.js";
import { BasicType } from "./basicType.js";
import { StorageType, StorageTypeConstructor } from "./storageType.js";

export const getIntrinsicStorageTypes = (types: StorageType[]): StorageType[] => {
    const output: StorageType[] = [];
    types.forEach((type) => {
        niceUtils.extendList(output, type.getIntrinsicStorageTypes());
    });
    return output;
};

// Returns whether any storage types were removed from either list.
// Assumes that each argument list contains no redundant types.
const removeComplementStorageTypes = (
    types1: StorageType[],
    types2: StorageType[],
): boolean => {
    let output = false;
    for (let index1 = types1.length - 1; index1 >= 0; index1--) {
        const type1 = types1[index1];
        for (let index2 = 0; index2 < types2.length; index2++) {
            const type2 = types2[index2];
            if (type1.isComplementOf(type2)) {
                types1.splice(index1, 1);
                types2.splice(index2, 1);
                output = true;
                break;
            }
        }
    }
    return output;
};

// Returns whether any modifications were made to the argument list.
const mergeBasicTypesHelper = (types: BasicType[]): boolean => {
    let output = false;
    let index1 = 0;
    while (index1 < types.length) {
        let type1 = types[index1];
        let shouldRemoveType1 = false;
        for (let index2 = types.length - 1; index2 > index1 && !shouldRemoveType1; index2--) {
            let type2 = types[index2];
            let shouldRemoveType2 = false;
            const storageTypes1 = type1.storageTypes.slice();
            const storageTypes2 = type2.storageTypes.slice();
            const hasRemovedStorageTypes = removeComplementStorageTypes(
                storageTypes1, storageTypes2,
            );
            let updatedType1: BasicType;
            let updatedType2: BasicType;
            if (hasRemovedStorageTypes) {
                updatedType1 = type1.copy();
                updatedType2 = type2.copy();
                updatedType1.setStorageTypes(storageTypes1);
                updatedType2.setStorageTypes(storageTypes2);
            } else {
                updatedType1 = type1;
                updatedType2 = type2;
            }
            const type1ContainsType2 = updatedType1.containsBasicType(updatedType2);
            const type2ContainsType1 = updatedType2.containsBasicType(updatedType1);
            if (type1ContainsType2) {
                if (type2ContainsType1) {
                    // In this case, updatedType1 and updatedType2
                    // are equal. We could keep either of them.
                    type1 = updatedType1;
                    shouldRemoveType2 = true;
                } else {
                    if (hasRemovedStorageTypes) {
                        type2 = updatedType2;
                    } else {
                        shouldRemoveType2 = true;
                    }
                }
                output = true;
            } else if (type2ContainsType1) {
                if (hasRemovedStorageTypes) {
                    type1 = updatedType1;
                } else {
                    shouldRemoveType1 = true;
                }
                output = true;
            }
            if (shouldRemoveType2) {
                types.splice(index2, 1);
            } else {
                types[index2] = type2;
            }
        }
        if (shouldRemoveType1) {
            types.splice(index1, 1);
        } else {
            types[index1] = type1;
            index1 += 1;
        }
    }
    return output;
};

export const mergeBasicTypes = (types: BasicType[]): BasicType[] => {
    const output = types.slice();
    while (true) {
        const hasModified = mergeBasicTypesHelper(output);
        if (!hasModified) {
            break;
        }
    }
    return output;
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
    const intrinsicTypes = getIntrinsicStorageTypes(output);
    for (let index1 = 0; index1 < intrinsicTypes.length; index1++) {
        const type1 = intrinsicTypes[index1];
        for (let index2 = index1 + 1; index2 < intrinsicTypes.length; index2++) {
            const type2 = intrinsicTypes[index2];
            if (!type1.intersectsStorageType(type2)) {
                return null;
            }
        }
        for (const type2 of output) {
            if (!type1.intersectsStorageType(type2)) {
                return null;
            }
        }
    }
    return output;
};

export const matchStorageType = <T extends StorageType = StorageType>(
    basicType: BasicType,
    storageTypeConstructor: StorageTypeConstructor<T>,
): T => {
    const storageType1 = new storageTypeConstructor();
    if (basicType.conformsToType(storageType1)) {
        return storageType1;
    }
    const storageType2 = new storageTypeConstructor(true);
    if (basicType.conformsToType(storageType2)) {
        return storageType2;
    }
    return null;
};

export const matchStorageTypes = (
    basicType: BasicType,
    storageTypeConstructors: StorageTypeConstructor[],
): StorageType[] => {
    const output: StorageType[] = [];
    storageTypeConstructors.forEach((storageTypeConstructor) => {
        const storageType = matchStorageType(basicType, storageTypeConstructor);
        if (storageType !== null) {
            output.push(storageType);
        }
    });
    return output;
};


