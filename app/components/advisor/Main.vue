<script setup lang="ts">
import type { FixThread } from "#shared/types/advisor";
import type {
    AdvisorPhase,
    AdvisorThreadResult,
} from "~/assets/models/advisor";
import {
    ClearTextCommand,
    ClearThreadsCommand,
} from "~/assets/models/commands";
import AdvisorDiffViewer from "./DiffViewer.vue";
import Rail from "./Rail.vue";

const { t } = useI18n();
const { validate, fix } = useAdvisor();
const toast = useToast();
const { threads, activeThreadId, addThread } = useAdvisorRevision();
const { executeCommand } = useCommandBus();

const text = defineModel<string>({ default: "" });
const selectedDocs = ref<string[]>([]);

const phase = ref<AdvisorPhase>("edit");

/**
 * Snapshot of the document text captured before a revision is applied. Used as
 * the diff baseline while the user reviews the corrected text.
 */
const diffOriginalText = ref("");

const lastResult = ref<Omit<AdvisorThreadResult, "threads">>({
    checked: 0,
    total: 1,
});

async function onCheck() {
    phase.value = "reviewing";

    try {
        const results = validate(text.value, selectedDocs.value);

        for await (const result of results) {
            lastResult.value = {
                checked: result.checked,
                total: result.total,
            };

            for (const thread of result.threads) {
                addThread(thread);
            }
        }

        phase.value = "review";
    } catch (error: unknown) {
        console.error("Advisor validation failed:", error);
        const message = error instanceof Error ? error.message : String(error);
        toast.add({
            title: t("advisor.checkFailed"),
            description: message,
            color: "error",
            icon: "i-lucide-alert-circle",
            duration: 5000,
        });
        phase.value = "edit";
    }
}

async function onApplyRevision() {
    phase.value = "fixing";
    const abortController = new AbortController();

    // Capture the pre-revision text before it is wiped: it is both the backend
    // payload and the diff baseline.
    const originalText = text.value;
    diffOriginalText.value = originalText;

    const fixThreads = threads.value.map(
        (x) =>
            ({
                notes: x.notes.map((x) => x.text),
                proposal: x.violation?.proposal,
                reason: x.violation?.reason,
                source: originalText.slice(x.range.start, x.range.end),
            }) as FixThread,
    );

    text.value = "";
    for await (const chunk of fix(
        originalText,
        fixThreads,
        abortController.signal,
    )) {
        text.value += chunk;
    }

    await executeCommand(new ClearThreadsCommand());
    phase.value = "diff";
}

/**
 * Commits the reviewed revision: the resolved text (corrected text with any
 * rejected hunks reverted) becomes the working document and the user returns to
 * the edit phase.
 */
function onDiffApply(resolvedText: string): void {
    text.value = resolvedText;
    diffOriginalText.value = "";
    phase.value = "edit";
}
</script>

<template>
    <div class="p-2 h-full w-full flex-1 flex">
        <div class="flex-1 p-2">
            <AdvisorEditor
                v-model:text="text"
                :phase="phase"
                :threads="threads"
                :activeThreadId="activeThreadId"
            />
        </div>

        <div class="flex-1 p-2">
            <div v-if="phase === 'edit'">
                <AdvisorDocSelect v-model="selectedDocs" />

                <UButton variant="ghost" @click="onCheck">{{
                    t("advisor.check")
                }}</UButton>
            </div>

            <div v-if="phase === 'reviewing'">
                <AdvisorValidationProgress :progress="lastResult" />
            </div>

            <div
                v-if="phase === 'reviewing' || phase === 'review'"
                class="h-full overflow-y-auto"
            >
                <Rail
                    :threads="threads"
                    :activeThreadId="activeThreadId"
                    :phase="phase"
                    @apply="onApplyRevision"
                />
            </div>

            <div v-if="phase === 'diff'" class="h-full">
                <AdvisorDiffViewer
                    :original-text="diffOriginalText"
                    :corrected-text="text"
                    @apply="onDiffApply"
                />
            </div>
        </div>
    </div>
</template>
