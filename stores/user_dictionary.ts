import { defineStore } from "pinia";
import { InvalidateCorrectionCommand } from "~/assets/models/commands";
import { createUserDictionaryQuery } from "~/assets/queries/user_dictionary.query";

// Type definition for the user dictionary store
export interface UserDictionaryStore {
    words: Ref<string[]>;
    addWord: (word: string) => Promise<void>;
    removeWord: (word: string) => Promise<void>;
    exists: (word: string) => Promise<boolean>;
}

export const useUserDictionaryStore = defineStore(
    "user_dictionary_store",
    (): UserDictionaryStore => {
        const userQuery = createUserDictionaryQuery();
        const words = ref<string[]>([]);
        const { executeCommand } = useCommandBus();

        userQuery.getWords().then((res) => {
            words.value = res;
        });

        const addWord = async (word: string) => {
            const word_trimmed = word.trim();
            await userQuery.addWord(word_trimmed);
            words.value.push(word_trimmed);

            await executeCommand(new InvalidateCorrectionCommand());
        };

        const removeWord = async (word: string) => {
            const word_trimmed = word.trim();

            await userQuery.removeWord(word_trimmed);
            words.value = words.value.filter((w) => w !== word_trimmed);

            await executeCommand(new InvalidateCorrectionCommand());
        };

        const exists = async (word: string) => {
            const word_trimmed = word.trim();
            return await userQuery.exists(word_trimmed);
        };

        return {
            words,
            addWord,
            removeWord,
            exists,
        };
    },
);
