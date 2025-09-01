<script lang="ts" setup>
import type { Editor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { ApplyTextCommand } from "~/assets/models/commands";

interface InputProps {
    text: string;
    editor: Editor;
    focusedSentence: TextFocus | undefined;
    focusedWord: TextFocus | undefined;
}

const props = defineProps<InputProps>();

const { t } = useI18n();
const { addProgress, removeProgress } = useUseProgressIndication();
const { executeCommand } = useCommandBus();
const { getAlternativeSentences } = useSentenceRewrite();

const wordSynonyms = ref<string[]>();
const alternativeSentences = ref<string[]>();
const isRewritingWord = ref<boolean>(false);
const isRewritingSentence = ref<boolean>(false);

watch(
    () => props.focusedWord,
    (newValue, oldValue) => {
        if (newValue !== oldValue) {
            wordSynonyms.value = [];
        }
    },
);

watch(
    () => props.focusedSentence,
    (newValue, oldValue) => {
        if (newValue !== oldValue) {
            alternativeSentences.value = [];
        }
    },
);

async function findWordSynonym() {
    if (
        !props.focusedSentence ||
        !props.focusedWord ||
        props.focusedWord.text.length === 0 ||
        props.focusedSentence.text.length === 0
    ) {
        return;
    }

    addProgress("finding-synonym", {
        title: t("text-editor.finding-synonym"),
        icon: "i-heroicons-magnifying-glass",
    });
    isRewritingWord.value = true;

    try {
        const result = await getWordSynonym(
            props.focusedWord.text,
            props.focusedSentence.text,
        );

        wordSynonyms.value = result.synonyms;
    } finally {
        removeProgress("finding-synonym");
        isRewritingWord.value = false;
    }
}

async function applyWordSynonym(synonym: string) {
    if (!props.focusedWord || !props.focusedSentence) {
        return;
    }

    await executeCommand(
        new ApplyTextCommand(synonym, {
            from: props.focusedWord.start,
            to: props.focusedWord.end,
        }),
    );

    wordSynonyms.value = [];
}

async function findAlternativeSentence() {
    if (!props.focusedSentence) {
        return;
    }

    addProgress("finding-alternative-sentence", {
        title: t("text-editor.finding-alternative-sentence"),
        icon: "i-heroicons-magnifying-glass",
    });
    isRewritingSentence.value = true;

    try {
        const result = await getAlternativeSentences(
            props.focusedSentence.text,
            props.text,
        );

        alternativeSentences.value = result.options;
    } finally {
        removeProgress("finding-alternative-sentence");
        isRewritingSentence.value = false;
    }
}

async function applyAlternativeSentence(sentence: string) {
    if (!props.focusedSentence) {
        return;
    }

    await executeCommand(
        new ApplyTextCommand(sentence, {
            from: props.focusedSentence.start,
            to: props.focusedSentence.end,
        }),
    );

    alternativeSentences.value = [];
}
</script>

<template>
        <bubble-menu
            :editor="editor"
            :options="{ placement: 'bottom'}"
            :should-show="() => true">
            <div
                class="bg-gray-100 p-2 rounded-lg flex gap-2 border border-gray-300"
                v-if="focusedSentence || focusedWord">
                <div v-if="focusedWord">
                        <UButton
                            @click="findWordSynonym"
                            :loading="isRewritingWord"
                            :disabled="isRewritingWord || isRewritingSentence"
                            variant="subtle">
                            {{ t("text-editor.rewrite-word") }}
                        </UButton>

                        <div class="flex gap-1 flex-col pt-1">
                            <UButton
                                v-for="synonym in wordSynonyms"
                                :key="synonym"
                                @click="applyWordSynonym(synonym)">
                                {{ synonym }}
                            </UButton>
                        </div>
                </div>
                <div v-if="focusedSentence">
                    <UButton
                        @click="findAlternativeSentence"
                        :loading="isRewritingSentence"
                        :disabled="isRewritingSentence || isRewritingWord"
                        variant="subtle">
                        {{ t("text-editor.rewrite-sentence") }}
                    </UButton>

                    <div class="flex gap-1 flex-col pt-1">
                        <UButton
                            v-for="sentence in alternativeSentences"
                            :key="sentence"
                            @click="applyAlternativeSentence(sentence)">
                            {{ sentence }}
                        </UButton>
                    </div>
                </div>
            </div>
        </bubble-menu>
</template>

<style scoped>
#arrow {
    position: absolute;
}
</style>