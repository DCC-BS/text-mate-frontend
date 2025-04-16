import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createUserDictionaryQuery } from "../../../assets/queries/user_dictionary.query";
import type { IUserDictionaryQuery } from "../../../assets/queries/user_dictionary.query.interface";

/**
 * Mock implementation for IndexedDB for testing purposes
 */
class MockIDBDatabase {
    objectStoreNames = {
        contains: vi.fn().mockReturnValue(false),
    };
    createObjectStore = vi.fn().mockReturnValue({
        put: vi.fn(),
        delete: vi.fn(),
        get: vi.fn(),
        openCursor: vi.fn(),
        count: vi.fn(),
        clear: vi.fn(),
    });
    close = vi.fn();
    transaction = vi.fn().mockImplementation(() => {
        const mockTransaction = {
            objectStore: vi.fn().mockImplementation(() => {
                const mockStore = {
                    put: vi.fn().mockImplementation(() => ({
                        onerror: null,
                    })),
                    delete: vi.fn().mockImplementation(() => ({
                        onerror: null,
                    })),
                    get: vi.fn().mockImplementation(() => ({
                        onerror: null,
                        onsuccess: null,
                        result: null,
                    })),
                    openCursor: vi.fn().mockImplementation(() => ({
                        onerror: null,
                        onsuccess: null,
                    })),
                    count: vi.fn().mockImplementation(() => ({
                        onerror: null,
                        onsuccess: null,
                        result: 0,
                    })),
                    clear: vi.fn().mockImplementation(() => ({
                        onerror: null,
                    })),
                };
                return mockStore;
            }),
            oncomplete: null,
        };
        return mockTransaction;
    });
}

/**
 * Test suite for UserDictionaryQuery
 */
describe("UserDictionaryQuery", () => {
    let userDictionaryQuery: IUserDictionaryQuery;
    let mockRequest: any;
    let mockDB: any;
    let originalIndexedDB: any;

    // Setup before each test
    beforeEach(() => {
        // Store the original indexedDB object if it exists
        originalIndexedDB = global.indexedDB;

        mockDB = new MockIDBDatabase();
        mockRequest = {
            onupgradeneeded: null,
            onerror: null,
            onsuccess: null,
            result: mockDB,
        };

        // Mock global indexedDB
        global.indexedDB = {
            open: vi.fn().mockReturnValue(mockRequest),
        } as any;

        userDictionaryQuery = createUserDictionaryQuery();
    });

    // Cleanup after each test
    afterEach(() => {
        // Restore original indexedDB
        global.indexedDB = originalIndexedDB;
        // Reset individual mocks if needed
        vi.restoreAllMocks();
    });

    /**
     * Test for the addWord method
     */
    describe("addWord", () => {
        it("should add a word to the user dictionary", async () => {
            // Arrange
            const testWord = "test";
            const putMock = vi.fn().mockReturnValue({
                onerror: null,
            });

            const transaction = {
                objectStore: vi.fn().mockReturnValue({
                    put: putMock,
                }),
                oncomplete: null,
            };

            mockDB.transaction = vi.fn().mockReturnValue(transaction);

            // Act
            const addPromise = userDictionaryQuery.addWord(testWord);

            // Trigger the success callback for opening the DB
            mockRequest.onsuccess({ target: { result: mockDB } });

            // Trigger transaction complete event
            if (transaction.oncomplete) {
                transaction.oncomplete({} as Event);
            }

            await addPromise;

            // Assert
            expect(putMock).toHaveBeenCalledWith({ word: testWord });
            expect(mockDB.close).toHaveBeenCalled();
        });

        it("should reject if there is an error adding a word", async () => {
            // Arrange
            const testWord = "test";
            const errorMessage = "Test error";

            const putRequest = {
                onerror: null,
            };

            const transaction = {
                objectStore: vi.fn().mockReturnValue({
                    put: vi.fn().mockReturnValue(putRequest),
                }),
                oncomplete: null,
            };

            mockDB.transaction = vi.fn().mockReturnValue(transaction);

            // Act
            const addPromise = userDictionaryQuery.addWord(testWord);

            // Trigger the success callback for opening the DB
            mockRequest.onsuccess({ target: { result: mockDB } });

            // Simulate an error by triggering the onerror event
            if (putRequest.onerror) {
                putRequest.onerror({
                    target: { error: { message: errorMessage } },
                } as any);
            }

            // Assert
            await expect(addPromise).rejects.toContain(errorMessage);
        });
    });

    /**
     * Test for the removeWord method
     */
    describe("removeWord", () => {
        it("should remove a word from the user dictionary", async () => {
            // Arrange
            const testWord = "test";
            const deleteMock = vi.fn().mockReturnValue({
                onerror: null,
            });

            const transaction = {
                objectStore: vi.fn().mockReturnValue({
                    delete: deleteMock,
                }),
                oncomplete: null,
            };

            mockDB.transaction = vi.fn().mockReturnValue(transaction);

            // Act
            const removePromise = userDictionaryQuery.removeWord(testWord);

            // Trigger the success callback for opening the DB
            mockRequest.onsuccess({ target: { result: mockDB } });

            // Trigger transaction complete event
            if (transaction.oncomplete) {
                transaction.oncomplete({} as Event);
            }

            await removePromise;

            // Assert
            expect(deleteMock).toHaveBeenCalledWith(testWord);
            expect(mockDB.close).toHaveBeenCalled();
        });
    });

    /**
     * Test for the getWords method
     */
    describe("getWords", () => {
        it("should get all words from the user dictionary", async () => {
            // Arrange
            const testWords = ["test1", "test2"];

            // Mock storage with test words
            const cursorRequest = {
                onerror: null,
                onsuccess: null,
            };

            const transaction = {
                objectStore: vi.fn().mockReturnValue({
                    openCursor: vi.fn().mockReturnValue(cursorRequest),
                }),
            };

            mockDB.transaction = vi.fn().mockReturnValue(transaction);

            // Act
            const getWordsPromise = userDictionaryQuery.getWords();

            // Trigger the success callback for opening the DB
            mockRequest.onsuccess({ target: { result: mockDB } });

            // Simulate cursor for first word
            if (cursorRequest.onsuccess) {
                cursorRequest.onsuccess({
                    target: {
                        result: {
                            value: { word: testWords[0] },
                            continue: vi.fn(),
                        },
                    },
                } as any);

                // Simulate cursor for second word
                cursorRequest.onsuccess({
                    target: {
                        result: {
                            value: { word: testWords[1] },
                            continue: vi.fn(),
                        },
                    },
                } as any);

                // Simulate end of cursor
                cursorRequest.onsuccess({
                    target: {
                        result: null,
                    },
                } as any);
            }

            const words = await getWordsPromise;

            // Assert
            expect(words).toEqual(testWords);
            expect(mockDB.close).toHaveBeenCalled();
        });
    });

    /**
     * Test for the getWordCount method
     */
    describe("getWordCount", () => {
        it("should get the count of words in the user dictionary", async () => {
            // Arrange
            const expectedCount = 5;

            const countRequest = {
                onerror: null,
                onsuccess: null,
                result: expectedCount,
            };

            const transaction = {
                objectStore: vi.fn().mockReturnValue({
                    count: vi.fn().mockReturnValue(countRequest),
                }),
            };

            mockDB.transaction = vi.fn().mockReturnValue(transaction);

            // Act
            const countPromise = userDictionaryQuery.getWordCount();

            // Trigger the success callback for opening the DB
            mockRequest.onsuccess({ target: { result: mockDB } });

            // Simulate count success
            if (countRequest.onsuccess) {
                countRequest.onsuccess({} as any);
            }

            const count = await countPromise;

            // Assert
            expect(count).toBe(expectedCount);
            expect(mockDB.close).toHaveBeenCalled();
        });
    });

    /**
     * Test for the clear method
     */
    describe("clear", () => {
        it("should clear all words from the user dictionary", async () => {
            // Arrange
            const clearRequest = {
                onerror: null,
            };

            const transaction = {
                objectStore: vi.fn().mockReturnValue({
                    clear: vi.fn().mockReturnValue(clearRequest),
                }),
                oncomplete: null,
            };

            mockDB.transaction = vi.fn().mockReturnValue(transaction);

            // Act
            const clearPromise = userDictionaryQuery.clear();

            // Trigger the success callback for opening the DB
            mockRequest.onsuccess({ target: { result: mockDB } });

            // Trigger transaction complete event
            if (transaction.oncomplete) {
                transaction.oncomplete({} as Event);
            }

            await clearPromise;

            // Assert
            expect(mockDB.transaction).toHaveBeenCalledWith(
                ["words"],
                "readwrite",
            );
            expect(mockDB.close).toHaveBeenCalled();
        });
    });

    /**
     * Test for the exists method
     */
    describe("exists", () => {
        it("should return true if a word exists in the user dictionary", async () => {
            // Arrange
            const testWord = "test";

            const getRequest = {
                onerror: null,
                onsuccess: null,
                result: { word: testWord },
            };

            const transaction = {
                objectStore: vi.fn().mockReturnValue({
                    get: vi.fn().mockReturnValue(getRequest),
                }),
            };

            mockDB.transaction = vi.fn().mockReturnValue(transaction);

            // Act
            const existsPromise = userDictionaryQuery.exists(testWord);

            // Trigger the success callback for opening the DB
            mockRequest.onsuccess({ target: { result: mockDB } });

            // Simulate get success
            if (getRequest.onsuccess) {
                getRequest.onsuccess({} as any);
            }

            const exists = await existsPromise;

            // Assert
            expect(exists).toBe(true);
            expect(mockDB.close).toHaveBeenCalled();
        });

        it("should return false if a word does not exist in the user dictionary", async () => {
            // Arrange
            const testWord = "test";

            const getRequest = {
                onerror: null,
                onsuccess: null,
                result: null,
            };

            const transaction = {
                objectStore: vi.fn().mockReturnValue({
                    get: vi.fn().mockReturnValue(getRequest),
                }),
            };

            mockDB.transaction = vi.fn().mockReturnValue(transaction);

            // Act
            const existsPromise = userDictionaryQuery.exists(testWord);

            // Trigger the success callback for opening the DB
            mockRequest.onsuccess({ target: { result: mockDB } });

            // Simulate get success
            if (getRequest.onsuccess) {
                getRequest.onsuccess({} as any);
            }

            const exists = await existsPromise;

            // Assert
            expect(exists).toBe(false);
            expect(mockDB.close).toHaveBeenCalled();
        });
    });
});
