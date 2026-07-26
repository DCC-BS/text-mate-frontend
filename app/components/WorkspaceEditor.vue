<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import {
    AddUserReviewCommand,
    ApplyTextCommand,
    ChangeActiveThreadId,
} from "~/assets/models/commands";
import BaseEditor from "~/components/editor/BaseEditor.vue";
import { useWorkspaceEditor } from "~/composables/useWorkspaceEditor";
import { selectionInfo } from "~/utils/advisorText";
import { threadWithSameRange } from "~/utils/advisorThreads";
import { getWordSynonym } from "~/utils/wordSynonym";

interface Props {
    limit: number;
    editable: Ref<boolean>;
    decorationsEnabled: Ref<boolean>;
    threads: Ref<import("~/assets/models/advisor").AdvisorThread[]>;
    activeThreadId: Ref<string | null>;
}

const props = defineProps<Props>();

const { t } = useI18n();
const { addProgress, removeProgress } = useUseProgressIndication();
const { executeCommand } = useCommandBus();
const { getAlternativeSentences } = useSentenceRewrite();

const model = defineModel<string>({ required: true });

const { editor, selection, focusedSentence, focusedWord, focusedSelection } =
    useWorkspaceEditor({
        text: model,
        limit: toRef(props, "limit"),
        editable: props.editable,
        decorationsEnabled: props.decorationsEnabled,
        threads: props.threads,
        activeThreadId: props.activeThreadId,
    });

const wordSynonyms = ref<string[]>();
const alternativeSentences = ref<string[]>();
const isRewritingWord = ref(false);
const isRewritingSentence = ref(false);

/**
 * Id of an existing thread whose range exactly matches the current selection,
 * if any. Drives the Add-Note button label (Reply vs Add Note) and dispatch.
 */
const replyTargetId = computed<string | null>(() => {
    const sel = selection.value;
    const ed = editor.value;
    if (!sel || !ed) {
        return null;
    }
    const info = selectionInfo(ed.state.doc, sel.from, sel.to);
    if (!info) {
        return null;
    }
    return threadWithSameRange(
        props.threads.value,
        info.startOffset,
        info.endOffset,
    );
});

const bubbleVisible = computed(() => {
    const sel = selection.value;
    return props.editable.value && !!sel && sel.text.trim().length > 0;
});

watch(
    () => focusedWord.value,
    () => {
        wordSynonyms.value = [];
    },
);
watch(
    () => focusedSentence.value,
    () => {
        alternativeSentences.value = [];
    },
);

// Scroll the active thread's decoration into view when it changes from
// elsewhere (e.g. selecting a ThreadCard).
watch(
    () => props.activeThreadId.value,
    (id) => {
        if (!id) {
            return;
        }
        nextTick(() => {
            const el = editor.value?.view.dom.querySelector(
                `[data-thread-id="${CSS.escape(id)}"]`,
            ) as HTMLElement | null;
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    },
);

async function findWordSynonym() {
    const word = focusedWord.value;
    const sentence = focusedSentence.value;
    if (!word || !sentence || word.text.length === 0) {
        return;
    }
    addProgress("finding-synonym", {
        title: t("text-editor.finding-synonym"),
        icon: "i-lucide-search",
    });
    isRewritingWord.value = true;
    try {
        const result = await getWordSynonym(word.text, sentence.text);
        wordSynonyms.value = result.synonyms;
    } finally {
        removeProgress("finding-synonym");
        isRewritingWord.value = false;
    }
}

async function applyWordSynonym(synonym: string) {
    const word = focusedWord.value;
    if (!word) {
        return;
    }
    await executeCommand(
        new ApplyTextCommand(synonym, { from: word.start, to: word.end }),
    );
    wordSynonyms.value = [];
}

async function findAlternativeSentence() {
    const sentence = focusedSentence.value;
    if (!sentence) {
        return;
    }
    addProgress("finding-alternative-sentence", {
        title: t("text-editor.finding-alternative-sentence"),
        icon: "i-lucide-search",
    });
    isRewritingSentence.value = true;
    try {
        const result = await getAlternativeSentences(
            sentence.text,
            model.value,
        );
        alternativeSentences.value = result.options;
    } finally {
        removeProgress("finding-alternative-sentence");
        isRewritingSentence.value = false;
    }
}

async function applyAlternativeSentence(sentence: string) {
    const focused = focusedSentence.value;
    if (!focused) {
        return;
    }
    await executeCommand(
        new ApplyTextCommand(sentence, {
            from: focused.start,
            to: focused.end,
        }),
    );
    alternativeSentences.value = [];
}

/**
 * Creates a user thread on the current selection, or focuses the existing
 * thread with the same range (so the user can reply in its card).
 */
function addNoteOrReply(): void {
    const sel = selection.value;
    const ed = editor.value;
    const targetId = replyTargetId.value;
    if (targetId) {
        executeCommand(new ChangeActiveThreadId(targetId));
    } else if (sel && ed) {
        const info = selectionInfo(ed.state.doc, sel.from, sel.to);
        if (!info) {
            return;
        }
        executeCommand(
            new AddUserReviewCommand({
                start: info.startOffset,
                end: info.endOffset,
            }),
        );
    }
    window.getSelection()?.removeAllRanges();
}

const bubbleMenuOptions = computed(() => ({
    strategy: "fixed" as const,
    placement: "bottom" as const,
}));

const bubbleMenuAppendTo = () => document.body;
</script>

<template>
    <BaseEditor
        :editor="editor"
        :text="model"
        :limit="props.limit"
        :selection="selection"
        :readonly="!props.editable.value"
        tour="text-editor"
    >
        <template #bubble="{ editor: ed }">
            <bubble-menu
                v-if="ed"
                :editor="ed"
                :options="bubbleMenuOptions"
                :append-to="bubbleMenuAppendTo"
                :should-show="() => bubbleVisible"
            >
                <div
                    class="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded-md ring-1 ring-gray-400 dark:ring-gray-600 shadow-md"
                >
                    <!-- Selection rewrites (word / sentence) -->
                    <div
                        v-if="focusedWord || focusedSentence"
                        class="flex flex-col"
                    >
                        <UButton
                            v-if="focusedWord"
                            :loading="isRewritingWord"
                            :disabled="isRewritingWord || isRewritingSentence"
                            variant="link"
                            color="primary"
                            icon="i-lucide-search"
                            @click="findWordSynonym"
                        >
                            {{ t("text-editor.rewrite-word") }}
                        </UButton>
                        <div
                            v-if="wordSynonyms?.length"
                            class="flex gap-1 flex-col pt-1"
                        >
                            <UButton
                                v-for="synonym in wordSynonyms"
                                :key="synonym"
                                color="neutral"
                                variant="link"
                                @click="applyWordSynonym(synonym)"
                            >
                                {{ synonym }}
                            </UButton>
                        </div>

                        <UButton
                            v-if="focusedSentence"
                            :loading="isRewritingSentence"
                            :disabled="isRewritingSentence || isRewritingWord"
                            variant="link"
                            color="primary"
                            icon="i-lucide-search"
                            @click="findAlternativeSentence"
                        >
                            {{ t("text-editor.rewrite-sentence") }}
                        </UButton>
                        <div
                            v-if="alternativeSentences?.length"
                            class="flex gap-1 flex-col pt-1"
                        >
                            <UButton
                                v-for="sentence in alternativeSentences"
                                :key="sentence"
                                variant="link"
                                color="neutral"
                                @click="applyAlternativeSentence(sentence)"
                            >
                                {{ sentence }}
                            </UButton>
                        </div>
                    </div>

                    <div
                        v-if="focusedWord || focusedSentence"
                        class="w-px self-stretch bg-gray-300 dark:bg-gray-600"
                    ></div>

                    <!-- Add note / reply -->
                    <UButton
                        variant="link"
                        color="primary"
                        :icon="
                            replyTargetId
                                ? 'i-lucide-message-square'
                                : 'i-lucide-message-square-plus'
                        "
                        @click="addNoteOrReply"
                    >
                        {{ replyTargetId ? t("advisor.reply") : t("advisor.addNote") }}
                    </UButton>
                </div>
            </bubble-menu>
        </template>
    </BaseEditor>
</template>

<style lang="css">
@reference "../assets/css/main.css";

.focused-sentence {
    @apply bg-blue-100;
    background-color: var(--color-blue-100);
    border-radius: 2px;
    padding: 1px 0;
}

.focused-word {
    color: var(--color-blue-500);
}

.text-added {
    @apply bg-green-100;
    background-color: var(--color-green-100);
}

.text-removed {
    @apply bg-red-100;
    background-color: var(--color-red-100);
}
</style>
