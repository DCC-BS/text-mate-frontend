/**
 * Interface for managing user dictionary operations
 * Provides methods to add, remove, retrieve and check for words in the user dictionary
 */
export interface IUserDictionaryQuery {
    /**
     * Adds a new word to the user dictionary
     * @param word - The word to add to the dictionary
     * @returns Promise that resolves when word is successfully added
     */
    addWord: (word: string) => Promise<void>;

    /**
     * Removes a word from the user dictionary
     * @param word - The word to remove from the dictionary
     * @returns Promise that resolves when word is successfully removed
     */
    removeWord: (word: string) => Promise<void>;

    /**
     * Gets all words from the user dictionary
     * @returns Promise that resolves with an array of all words in the dictionary
     */
    getWords: () => Promise<string[]>;

    /**
     * Gets the count of words in the user dictionary
     * @returns Promise that resolves with the number of words in the dictionary
     */
    getWordCount: () => Promise<number>;

    /**
     * Clears all words from the user dictionary
     * @returns Promise that resolves when dictionary is successfully cleared
     */
    clear: () => Promise<void>;

    /**
     * Checks if a word exists in the user dictionary
     * @param word - The word to check for existence
     * @returns Promise that resolves with boolean indicating if the word exists
     */
    exists: (word: string) => Promise<boolean>;
}
