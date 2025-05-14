import type { IUserDictionaryQuery } from "./user_dictionary.query.interface";

/**
 * Factory function that creates a new UserDictionaryQuery instance
 * @returns A new UserDictionaryQuery instance
 */
export function createUserDictionaryQuery(): IUserDictionaryQuery {
    return new UserDictionaryQuery();
}

/**
 * Implementation of UserDictionaryQuery using IndexedDB for persistence
 * with fallback to in-memory storage when IndexedDB is not available
 */
class UserDictionaryQuery implements IUserDictionaryQuery {
    private readonly dbName: string = "userDictionary";
    private readonly storeName: string = "words";
    private readonly dbVersion: number = 1;
    private readonly isIndexedDBAvailable: boolean;
    private inMemoryDictionary: Set<string> = new Set<string>();

    constructor() {
        // Check if IndexedDB is available in the current environment
        this.isIndexedDBAvailable =
            typeof window !== "undefined" &&
            window.indexedDB !== undefined &&
            window.indexedDB !== null;
    }

    /**
     * Opens a connection to the IndexedDB database
     * @returns Promise with the database connection
     */
    private openDB(): Promise<IDBDatabase> {
        // If IndexedDB is not available, use in-memory fallback
        if (!this.isIndexedDBAvailable) {
            return Promise.reject(
                new Error("IndexedDB is not available in this environment"),
            );
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            // Handle database upgrade or creation
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: "word" });
                }
            };

            request.onerror = (event) => {
                reject(
                    `Database error: ${(event.target as IDBOpenDBRequest).error?.message}`,
                );
            };

            request.onsuccess = (event) => {
                resolve((event.target as IDBOpenDBRequest).result);
            };
        });
    }

    /**
     * Adds a word to the user dictionary
     * @param word The word to add
     */
    async addWord(word: string): Promise<void> {
        const normalizedWord = word.trim();

        if (!this.isIndexedDBAvailable) {
            this.inMemoryDictionary.add(normalizedWord);
            return;
        }

        try {
            const db = await this.openDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(
                    [this.storeName],
                    "readwrite",
                );
                const store = transaction.objectStore(this.storeName);

                // Add the word as an object with the word as the key
                const request = store.put({ word: normalizedWord });

                request.onerror = (event) => {
                    reject(
                        `Error adding word: ${(event.target as IDBRequest).error?.message}`,
                    );
                };

                transaction.oncomplete = () => {
                    db.close();
                    resolve();
                };
            });
        } catch (error) {
            // Fallback to in-memory if IndexedDB operation fails
            console.error(
                "IndexedDB operation failed, using in-memory fallback:",
                error,
            );
            this.inMemoryDictionary.add(normalizedWord);
        }
    }

    /**
     * Removes a word from the user dictionary
     * @param word The word to remove
     */
    async removeWord(word: string): Promise<void> {
        const normalizedWord = word.trim();

        if (!this.isIndexedDBAvailable) {
            this.inMemoryDictionary.delete(normalizedWord);
            return;
        }

        try {
            const db = await this.openDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(
                    [this.storeName],
                    "readwrite",
                );
                const store = transaction.objectStore(this.storeName);

                const request = store.delete(normalizedWord);

                request.onerror = (event) => {
                    reject(
                        `Error removing word: ${(event.target as IDBRequest).error?.message}`,
                    );
                };

                transaction.oncomplete = () => {
                    db.close();
                    resolve();
                };
            });
        } catch (error) {
            // Fallback to in-memory if IndexedDB operation fails
            console.error(
                "IndexedDB operation failed, using in-memory fallback:",
                error,
            );
            this.inMemoryDictionary.delete(normalizedWord);
        }
    }

    /**
     * Gets all words from the user dictionary
     * @returns Promise with an array of words
     */
    async getWords(): Promise<string[]> {
        if (!this.isIndexedDBAvailable) {
            return Array.from(this.inMemoryDictionary);
        }

        try {
            const db = await this.openDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(
                    [this.storeName],
                    "readonly",
                );
                const store = transaction.objectStore(this.storeName);
                const words: string[] = [];

                const request = store.openCursor();

                request.onerror = (event) => {
                    reject(
                        `Error getting words: ${(event.target as IDBRequest).error?.message}`,
                    );
                };

                request.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest).result;

                    if (cursor) {
                        words.push(cursor.value.word);
                        cursor.continue();
                    } else {
                        db.close();
                        resolve(words);
                    }
                };
            });
        } catch (error) {
            // Fallback to in-memory if IndexedDB operation fails
            console.error(
                "IndexedDB operation failed, using in-memory fallback:",
                error,
            );
            return Array.from(this.inMemoryDictionary);
        }
    }

    /**
     * Gets the count of words in the user dictionary
     * @returns Promise with the count of words
     */
    async getWordCount(): Promise<number> {
        if (!this.isIndexedDBAvailable) {
            return this.inMemoryDictionary.size;
        }

        try {
            const db = await this.openDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(
                    [this.storeName],
                    "readonly",
                );
                const store = transaction.objectStore(this.storeName);

                const countRequest = store.count();

                countRequest.onerror = (event) => {
                    reject(
                        `Error counting words: ${(event.target as IDBRequest).error?.message}`,
                    );
                };

                countRequest.onsuccess = () => {
                    db.close();
                    resolve(countRequest.result);
                };
            });
        } catch (error) {
            // Fallback to in-memory if IndexedDB operation fails
            console.error(
                "IndexedDB operation failed, using in-memory fallback:",
                error,
            );
            return this.inMemoryDictionary.size;
        }
    }

    /**
     * Clears all words from the user dictionary
     */
    async clear(): Promise<void> {
        if (!this.isIndexedDBAvailable) {
            this.inMemoryDictionary.clear();
            return;
        }

        try {
            const db = await this.openDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(
                    [this.storeName],
                    "readwrite",
                );
                const store = transaction.objectStore(this.storeName);

                const request = store.clear();

                request.onerror = (event) => {
                    reject(
                        `Error clearing dictionary: ${(event.target as IDBRequest).error?.message}`,
                    );
                };

                transaction.oncomplete = () => {
                    db.close();
                    resolve();
                };
            });
        } catch (error) {
            // Fallback to in-memory if IndexedDB operation fails
            console.error(
                "IndexedDB operation failed, using in-memory fallback:",
                error,
            );
            this.inMemoryDictionary.clear();
        }
    }

    /**
     * Checks if a word exists in the user dictionary
     * @param word The word to check
     * @returns Promise with boolean indicating if the word exists
     */
    async exists(word: string): Promise<boolean> {
        const normalizedWord = word.trim();

        console.log(
            `Checking existence of word: ${normalizedWord} in IndexedDB: ${this.isIndexedDBAvailable}`,
        );

        if (!this.isIndexedDBAvailable) {
            return this.inMemoryDictionary.has(normalizedWord);
        }

        try {
            const db = await this.openDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(
                    [this.storeName],
                    "readonly",
                );

                const store = transaction.objectStore(this.storeName);
                const request = store.get(normalizedWord);

                request.onerror = (event) => {
                    reject(
                        `Error checking word: ${(event.target as IDBRequest).error?.message}`,
                    );
                };

                request.onsuccess = () => {
                    db.close();
                    resolve(!!request.result);
                };
            });
        } catch (error) {
            // Fallback to in-memory if IndexedDB operation fails
            console.error(
                "IndexedDB operation failed, using in-memory fallback:",
                error,
            );
            return this.inMemoryDictionary.has(normalizedWord);
        }
    }
}
