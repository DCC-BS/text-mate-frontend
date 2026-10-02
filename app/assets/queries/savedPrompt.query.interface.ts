import type { SavedPrompt, SavedPromptInput } from "~/types/savedPrompt";

/**
 * Storage operations for prompts the user saved in this browser.
 * Every method rejects with a ZodError when the input breaks the save rules.
 */
export interface ISavedPromptQuery {
    /**
     * Gets all saved prompts sorted by name.
     * @returns Promise with the prompts
     */
    getAll: () => Promise<SavedPrompt[]>;

    /**
     * Saves a new prompt.
     * @param input - Name and instruction text
     * @returns Promise with the stored prompt
     */
    add: (input: SavedPromptInput) => Promise<SavedPrompt>;

    /**
     * Updates the name and text of a stored prompt.
     * @param id - Id of the prompt to update
     * @param input - New name and instruction text
     * @returns Promise with the updated prompt; rejects if the id is unknown
     */
    update: (id: string, input: SavedPromptInput) => Promise<SavedPrompt>;

    /**
     * Deletes a prompt. Unknown ids are ignored.
     * @param id - Id of the prompt to delete
     */
    remove: (id: string) => Promise<void>;

    /**
     * Saves several prompts in one transaction (used by import).
     * @param inputs - Names and instruction texts
     * @returns Promise with the number of stored prompts
     */
    addMany: (inputs: readonly SavedPromptInput[]) => Promise<number>;
}
