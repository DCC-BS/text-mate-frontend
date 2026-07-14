<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";
import type { AdvisorThread } from "~/assets/models/advisor";
import {
    ClearThreadsCommand,
    RetryQuickActionCommand,
} from "~/assets/models/commands";
import PdfViewerClient from "~/components/advisor/PdfViewer.client.vue";
import Rail from "~/components/advisor/Rail.vue";
import ValidationProgress from "~/components/advisor/ValidationProgress.vue";
import DiffViewer from "~/components/diff/DiffViewer.vue";
import type { DiffHunk } from "~/types/diff";

const { t } = useI18n();
const { getDocFile } = useAdvisor();
const overlay = useOverlay();
const logger = useLogger();
const toast = useToast();
const { executeCommand } = useCommandBus();
const breakpoints = useBreakpoints(breakpointsTailwind);

const text = defineModel<string>({ required: true });

const ws = useWorkspace(text);
const pdfModal = overlay.create(PdfViewerClient);

const diffViewerRef = ref<InstanceType<typeof DiffViewer> | null>(null);
const mobileRailOpen = ref(false);
const clearOpen = ref(false);

const inDiffReview = computed(() => ws.state.value === "diff-review");

/** True while corrected text is streaming into the diff review. */
const isStreaming = computed(() => ws.progress.value !== "none");

/** Context-aware label for the diff streaming indicator. */
const streamingLabel = computed(() =>
    ws.progress.value === "fixing"
        ? t("workspace.fixing")
        : t("workspace.generating"),
);

/** True while an Advisor Check stream is running. */
const isChecking = computed(() => ws.progress.value === "checking");

watch(ws.activeThreadId, (value) => {
    if (value && breakpoints.isSmaller("md")) {
        openMobileRail();
    }
});

/** Commits the resolved diff text back to the Working Text. No-op while the
    corrected text is still streaming, so the view cannot close mid-stream. */
function commitResolved(): void {
    if (isStreaming.value) {
        return;
    }
    const resolved = diffViewerRef.value?.getResolvedText();
    if (resolved !== undefined) {
        ws.commitDiff(resolved);
    }
}

function onAcceptHunk(_hunk: DiffHunk): void {
    if (!diffViewerRef.value?.hasPendingHunks()) {
        commitResolved();
    }
}

function onRejectHunk(_hunk: DiffHunk): void {
    if (!diffViewerRef.value?.hasPendingHunks()) {
        commitResolved();
    }
}

/**
 * Leaves Diff Review when the corrected text held no reviewable hunks
 * (no-op or empty response). See ADR 0003.
 */
function onDismissDiff(): void {
    ws.exitDiffReview();
}

function retry(): void {
    executeCommand(new RetryQuickActionCommand());
}

function openMobileRail(): void {
    mobileRailOpen.value = true;
}

function cancelClear(): void {
    clearOpen.value = false;
}

function confirmClear(): void {
    executeCommand(new ClearThreadsCommand());
    clearOpen.value = false;
    toast.add({
        title: t("advisor.allClear"),
        color: "success",
        icon: "i-lucide-check",
        duration: 2000,
    });
}

async function onOpenPdf(thread: AdvisorThread): Promise<void> {
    const violation = thread.violation;
    if (!violation) {
        logger.error("Cannot open pdf, violation is empty");
        return;
    }
    const blob = await getDocFile(violation.file_name);
    pdfModal.open({
        file: blob,
        page: violation.page_number,
        fileName: violation.file_name,
        onClose: () => pdfModal.close(),
    });
}
</script>

<template>
    <div class="h-full w-full flex flex-col">
        <RibbonBar
            :text="text"
            :busy="ws.isBusy.value"
            :editable="ws.editable.value"
            :selected-docs="ws.selectedDocs.value"
            :max-docs="5"
            :to-fix-count="
                ws.threads.value.filter((x) => x.status === 'to-fix').length
            "
            @update:selected-docs="ws.selectedDocs.value = $event"
            @clear="clearOpen = true"
        />

        <!-- Main area: centered editor/diff + right rail -->
        <div class="flex-1 min-h-0 flex bg-gray-100">
            <div class="flex-1 min-w-0 flex justify-center overflow-hidden">
                <div
                    :class="[
                        'w-full h-full p-2 bg-white shadow relative',
                        inDiffReview ? '' : 'max-w-6xl',
                    ]"
                >
                    <!-- Diff review replaces the editor -->
                    <div
                        v-if="inDiffReview"
                        class="h-full"
                        data-tour="diff-review"
                    >
                        <DiffViewer
                            :key="ws.diffKey.value"
                            ref="diffViewerRef"
                            :original-text="ws.originalText.value"
                            :corrected-text="ws.correctedText.value"
                            :streaming="isStreaming"
                            :streaming-label="streamingLabel"
                            i18n-prefix="advisor"
                            :title="t('workspace.diffTitle')"
                            @accept-hunk="onAcceptHunk"
                            @reject-hunk="onRejectHunk"
                            @accept-all="commitResolved"
                            @reject-all="commitResolved"
                            @dismiss="onDismissDiff"
                        >
                            <template #actions>
                                <UTooltip
                                    :text="t('rewrite-diff-viewer.retry')"
                                >
                                    <UButton
                                        variant="outline"
                                        color="neutral"
                                        size="xs"
                                        square
                                        icon="i-lucide-rotate-ccw"
                                        :disabled="isStreaming"
                                        data-tour="retry-quick-action"
                                        @click="retry"
                                    />
                                </UTooltip>
                            </template>
                        </DiffViewer>
                    </div>

                    <!-- Editor -->
                    <WorkspaceEditor
                        v-else
                        v-model="text"
                        :limit="100_000"
                        :editable="ws.editable"
                        :decorations-enabled="ws.decorationsEnabled"
                        :threads="ws.threads"
                        :active-thread-id="ws.activeThreadId"
                    />

                    <!-- Check progress: pinned below the ribbon, overlays and
                         blocks the editor until the Advisor check finishes. -->
                    <template v-if="isChecking">
                        <div
                            class="absolute inset-0 z-10 bg-white/50 backdrop-blur-[1px]"
                        />
                        <div
                            class="absolute top-0 inset-x-0 z-20 px-4 py-3 border-b border-default bg-white/95 shadow-sm"
                        >
                            <ValidationProgress
                                :progress="ws.checkProgress.value"
                            />
                        </div>
                    </template>
                </div>
            </div>

            <!-- Right rail (desktop): comments/violations margin -->
            <div
                v-if="ws.threads.value.length"
                data-tour="threads-rail"
                class="hidden md:flex w-[380px] shrink-0 border-l border-default"
            >
                <Rail
                    class="w-full"
                    :threads="ws.threads.value"
                    :active-thread-id="ws.activeThreadId.value"
                    :checking="ws.progress.value === 'checking'"
                    @open-pdf="onOpenPdf"
                />
            </div>
        </div>

        <!-- Mobile rail toggle -->
        <UButton
            v-if="ws.threads.value.length"
            class="md:hidden fixed right-4 bottom-16 z-20 rounded-full shadow-lg"
            color="primary"
            circle
            icon="i-lucide-message-square"
            @click="openMobileRail"
        />

        <USlideover v-model:open="mobileRailOpen" title="Advisor" side="right">
            <template #content>
                <Rail
                    :threads="ws.threads.value"
                    :active-thread-id="ws.activeThreadId.value"
                    :checking="ws.progress.value === 'checking'"
                    @open-pdf="onOpenPdf"
                />
            </template>
        </USlideover>

        <!-- Clear confirm -->
        <UModal v-model:open="clearOpen">
            <template #content>
                <div class="p-4 flex flex-col gap-3">
                    <h3 class="text-base font-semibold text-highlighted">
                        {{ t("ribbon.clearConfirm") }}
                    </h3>
                    <p class="text-sm text-muted">
                        {{ t("ribbon.clearConfirmDesc") }}
                    </p>
                    <div class="flex justify-end gap-2 pt-2">
                        <UButton
                            variant="ghost"
                            color="neutral"
                            @click="cancelClear"
                        >
                            {{ t("common.cancel") }}
                        </UButton>
                        <UButton
                            color="error"
                            icon="i-lucide-trash-2"
                            @click="confirmClear"
                        >
                            {{ t("ribbon.clear") }}
                        </UButton>
                    </div>
                </div>
            </template>
        </UModal>
    </div>
</template>
