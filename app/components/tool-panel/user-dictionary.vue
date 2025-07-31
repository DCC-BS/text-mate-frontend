<script lang="ts" setup>
import { UserDictionaryQuery } from "~/assets/queries/user_dictionary.query";

const userDictionaryQuery = useService(UserDictionaryQuery);

const newWord = ref<string>("");
const words = userDictionaryQuery.getWordsRef();

const { t } = useI18n();

function addNewWord() {
    if (newWord.value.trim() !== "") {
        userDictionaryQuery.addWord(newWord.value.trim());
        newWord.value = "";
    }
}
</script>

<template>
  <div>
    <UPopover>
      <UButton
        icon="i-heroicons-book-open"
        color="info"
        class="w-full">
        {{ t("user-dictionary.title") }}
      </UButton>

      <template #content>
        <div class="flex gap-2 flex-col justify-evenly p-2 w-full">
          <!-- Add new word input area -->
          <div class="flex items-center gap-2 mb-2">
            <UInput
              v-model="newWord"
              :placeholder="t('user-dictionary.placeholder')"
              @keyup.enter="addNewWord"
              class="flex-grow"
            />
            <UButton
              color="success"
              icon="i-heroicons-plus"
              @click="addNewWord"
            >
              {{ t("user-dictionary.add") }}
            </UButton>
          </div>

          <div v-if="words.length === 0" class="text-center text-gray-500">
            {{ t("user-dictionary.empty") }}
          </div>
          
          <!-- Word list -->
          <div v-for="word in words" :key="word" class="flex items-center justify-between gap-2">
              <span>{{ word }}</span>
              <UButton
                :key="word"
                color="error"
                icon="i-heroicons-trash"
                @click="userDictionaryQuery.removeWord(word)"
              >
              </UButton>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>