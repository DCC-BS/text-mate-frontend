/**
 * Represents the progress of an editor operation.
 */
export type EditoreProgress = {
    icon: string;
    title: string;
};

const activeProgresDict = ref<Map<string, EditoreProgress>>(new Map());

/**
 * Provides methods to manage progress indications.
 *
 * @returns An object containing methods to add and remove progress indications, and the active progress dictionary.
 */
export const useUseProgressIndication = () => {
    return {
        addProgress,
        removeProgress,
        activeProgress: activeProgresDict,
    };
};

/**
 * Adds a progress indication.
 *
 * @param key - The key to identify the progress indication.
 * @param progress - The progress indication to add.
 * @returns A function to remove the added progress indication.
 */
const addProgress = (key: string, progress: EditoreProgress) => {
    activeProgresDict.value.set(key, progress);

    return () => {
        removeProgress(key);
    };
};

/**
 * Removes a progress indication.
 *
 * @param key - The key to identify the progress indication to remove.
 */
const removeProgress = (key: string) => {
    activeProgresDict.value.delete(key);
};
