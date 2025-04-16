import { defineStore } from "pinia";
import { InvalidateCorrectionCommand } from "~/assets/models/commands";
import { createUserDictionaryQuery } from "~/assets/queries/user_dictionary.query";

export const useUserDictionaryStore = defineStore(
    "user_dictionary_store",
    () => {
        const userQuery = createUserDictionaryQuery();
        const words = ref<string[]>([]);
        const { executeCommand } = useCommandBus();

        userQuery.getWords().then((res) => {
            words.value = res;
        });

        const addWord = async (word: string) => {
            await userQuery.addWord(word);
            words.value.push(word);

            await executeCommand(new InvalidateCorrectionCommand());
        };

        const removeWord = async (word: string) => {
            await userQuery.removeWord(word);
            words.value = words.value.filter((w) => w !== word);

            await executeCommand(new InvalidateCorrectionCommand());
        };

        const exists = async (word: string) => {
            return await userQuery.exists(word);
        };

        return {
            words,
            addWord,
            removeWord,
            exists,
        };
    },
);
