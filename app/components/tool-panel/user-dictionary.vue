<script lang="ts" setup>
import { InvalidateCorrectionCommand } from "~/assets/models/commands";
import { UserDictionaryQuery } from "~/assets/queries/user_dictionary.query";

const userDictionaryQuery = useService(UserDictionaryQuery);
const { executeCommand } = useCommandBus();

const newWord = ref<string>("");
const words = userDictionaryQuery.getWordsRef();

const { t } = useI18n();

async function addNewWord() {
    if (newWord.value.trim() !== "") {
        await userDictionaryQuery.addWord(newWord.value.trim());
        newWord.value = "";
        await executeCommand(new InvalidateCorrectionCommand());
    }
}

async function removeWord(word: string) {
    await userDictionaryQuery.removeWord(word);
    await executeCommand(new InvalidateCorrectionCommand());
}
</script>

<template>
    <div data-tour="dictionary">
        <UPopover>
            <UButton icon="i-lucide-book-open" color="neutral" variant="link" class="w-full">
                {{ t("user-dictionary.title") }}
            </UButton>

            <template #content>
                <div class="flex gap-2 flex-col justify-evenly p-2 w-full">
                    <!-- Add new word input area -->
                    <div class="flex items-center gap-2 mb-2">
                        <UInput v-model="newWord" :placeholder="t('user-dictionary.placeholder')"
                            @keyup.enter="addNewWord" class="flex-grow" />
                        <UButton variant="link" color="success" icon="i-lucide-plus" @click="addNewWord">
                            {{ t("user-dictionary.add") }}
                        </UButton>
                    </div>

                    <div v-if="words.length === 0" class="text-center text-gray-500">
                        {{ t("user-dictionary.empty") }}
                    </div>

                    <!-- Word list -->
                    <div v-for="word in words" :key="word" class="flex items-center justify-between gap-2">
                        <span>{{ word }}</span>
                        <UButton :key="word" variant="link" color="error" icon="i-lucide-trash-2"
                            @click="removeWord(word)" />
                    </div>
                </div>
            </template>
        </UPopover>
    </div>
</template>
