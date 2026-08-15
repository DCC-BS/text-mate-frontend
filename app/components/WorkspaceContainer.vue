<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";
import type { AdvisorThread } from "~/assets/models/advisor";
import {
    type ApplyFixCommand,
    ChangeActiveThreadId,
    ClearThreadsCommand,
    Cmds,
    RetryQuickActionCommand,
} from "~/assets/models/commands";
import PdfViewerClient from "~/components/advisor/PdfViewer.client.vue";
import Rail from "~/components/advisor/Rail.vue";
import ValidationProgress from "~/components/advisor/ValidationProgress.vue";
import DiffViewer from "~/components/diff/DiffViewer.vue";
import ReadabilityScoreBadge from "~/components/ReadabilityScoreBadge.vue";
import SimplifyProgress from "~/components/simplify/SimplifyProgress.vue";
import SimplifyRangeNav from "~/components/simplify/SimplifyRangeNav.vue";
import type { DiffHunk } from "~/types/diff";
import { isUnscored, type ReadabilityScore } from "~/utils/readability";

const { t } = useI18n();
const { getDocFile } = useAdvisor();
const overlay = useOverlay();
const logger = useLogger();
const toast = useToast();
const { executeCommand, onCommand } = useCommandBus();
const breakpoints = useBreakpoints(breakpointsTailwind);

const text = defineModel<string>({ required: true });

const ws = useWorkspace(text);
const pdfModal = overlay.create(PdfViewerClient);

const diffViewerRef = ref<InstanceType<typeof DiffViewer>>();
const mobileRailOpen = ref(false);
const clearOpen = ref(false);

const inDiffReview = computed(() => ws.state.value === "diff-review");

const isStreaming = computed(() => ws.progress.value !== "none");

const streamingLabel = computed(() => {
    if (ws.progress.value === "fixing") {
        return t("workspace.fixing");
    }
    if (ws.progress.value === "simplifying") {
        return t("simplify.running");
    }
    return t("workspace.generating");
});

const isChecking = computed(() => ws.progress.value === "checking");

const isSimplifying = computed(() => ws.progress.value === "simplifying");

const isSimplifyDiff = computed(() => ws.diffMode.value === "simplify");

const diffTitle = computed(() =>
    isSimplifyDiff.value ? t("simplify.diffTitle") : t("workspace.diffTitle"),
);

const scoreBefore = computed<ReadabilityScore>(() => ({
    scored: ws.simplifyProgress.value.scored,
    language: ws.simplifyProgress.value.language,
    scoreLabel: ws.simplifyProgress.value.scoreLabel,
    score: ws.simplifyProgress.value.scoreBefore,
    band: ws.simplifyProgress.value.bandBefore,
    cefr: ws.simplifyProgress.value.cefrBefore,
}));

const scoreAfter = computed<ReadabilityScore>(() => {
    const result = ws.simplifyResult.value;
    return {
        scored: result?.scored ?? false,
        language: result?.language,
        scoreLabel: result?.score_label,
        score: result?.score_after,
        band: result?.band_after,
        cefr: result?.cefr_after,
    };
});

const showsScoreComparison = computed(
    () =>
        isSimplifyDiff.value &&
        !isSimplifying.value &&
        !isUnscored(scoreBefore.value) &&
        !isUnscored(scoreAfter.value),
);

const simplifyFailureNotice = computed<string | undefined>(() => {
    if (!isSimplifyDiff.value) {
        return undefined;
    }
    const failures = ws.simplifyResult.value?.rewrite_failures ?? 0;
    return failures > 0 ? t("simplify.rewriteFailed") : undefined;
});

const unconvergedCount = computed<number>(() => ws.simplifyRanges.value.length);

const simplifyConverged = computed<boolean>(
    () => ws.simplifyResult.value?.converged ?? false,
);

const activeSimplifyRangeKind = computed(
    () => ws.simplifyRanges.value[ws.activeSimplifyRangeIndex.value]?.kind,
);

function onSimplifyRangePrev(): void {
    ws.prevSimplifyRange();
}

function onSimplifyRangeNext(): void {
    ws.nextSimplifyRange();
}

function onSimplifyRangeDismiss(): void {
    ws.clearSimplifyRanges();
}

watch(ws.activeThreadId, (value) => {
    if (value && breakpoints.isSmaller("md")) {
        openMobileRail();
    }
});

watch(mobileRailOpen, async (isOpen) => {
    if (!isOpen) {
        await executeCommand(new ChangeActiveThreadId(null));
    }
});

onCommand<ApplyFixCommand>(Cmds.ApplyFixCommand, async () => {
    mobileRailOpen.value = false;
});

function commitResolved(): void {
    if (isStreaming.value) {
        return;
    }
    const resolved = diffViewerRef.value?.getResolvedText();
    if (resolved === undefined) {
        return;
    }
    if (isSimplifyDiff.value) {
        const raw = ws.simplifyResult.value?.unconverged_ranges ?? [];
        const mapped = diffViewerRef.value?.mapUnconvergedRanges(raw) ?? [];
        ws.commitSimplifyDiff(resolved, mapped);
    } else {
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
    <div class="h-full w-full min-w-0 flex flex-col">
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
        <div class="flex-1 min-h-0 flex bg-muted">
            <div class="flex-1 min-w-0 flex justify-center overflow-hidden">
                <div
                    :class="[
                        'w-full h-full p-2 bg-default shadow relative',
                        inDiffReview ? '' : 'max-w-6xl',
                    ]"
                >
                    <!-- Diff review replaces the editor -->
                    <div
                        v-if="inDiffReview"
                        class="h-full flex flex-col min-h-0"
                        data-tour="diff-review"
                    >
                        <SimplifyProgress
                            v-if="isSimplifying"
                            :progress="ws.simplifyProgress.value"
                        />

                        <DiffViewer
                            :key="ws.diffKey.value"
                            ref="diffViewerRef"
                            class="flex-1 min-h-0"
                            :original-text="ws.originalText.value"
                            :corrected-text="ws.correctedText.value"
                            :streaming="isStreaming"
                            :streaming-label="streamingLabel"
                            i18n-prefix="advisor"
                            :title="diffTitle"
                            :no-change-notice="simplifyFailureNotice"
                            @accept-hunk="onAcceptHunk"
                            @reject-hunk="onRejectHunk"
                            @accept-all="commitResolved"
                            @reject-all="commitResolved"
                            @dismiss="onDismissDiff"
                        >
                            <template #actions>
                                <div
                                    v-if="showsScoreComparison"
                                    class="flex items-center gap-2 mr-1"
                                    data-testid="simplifyScoreComparison"
                                    :aria-label="t('simplify.scoreComparison')"
                                >
                                    <ReadabilityScoreBadge
                                        :value="scoreBefore"
                                        compact
                                    />
                                    <UIcon
                                        name="i-lucide-arrow-right"
                                        class="size-3.5 text-muted"
                                    />
                                    <ReadabilityScoreBadge
                                        :value="scoreAfter"
                                        compact
                                    />
                                </div>
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
                    <div v-else class="h-full flex flex-col min-h-0">
                        <SimplifyRangeNav
                            :count="unconvergedCount"
                            :converged="simplifyConverged"
                            :active-index="ws.activeSimplifyRangeIndex.value"
                            :active-kind="activeSimplifyRangeKind"
                            @prev="onSimplifyRangePrev"
                            @next="onSimplifyRangeNext"
                            @dismiss="onSimplifyRangeDismiss"
                        />
                        <WorkspaceEditor
                            v-model="text"
                            class="flex-1 min-h-0"
                            :limit="100_000"
                            :editable="ws.editable"
                            :decorations-enabled="ws.decorationsEnabled"
                            :threads="ws.threads"
                            :active-thread-id="ws.activeThreadId"
                        />
                    </div>

                    <!-- Check progress -->
                    <template v-if="isChecking">
                        <div
                            class="absolute inset-0 z-10 bg-default/50 backdrop-blur-[1px]"
                        />
                        <div
                            class="absolute top-0 inset-x-0 z-20 px-4 py-3 border-b border-default bg-default/95 shadow-sm"
                        >
                            <ValidationProgress
                                :progress="ws.checkProgress.value"
                            />
                        </div>
                    </template>

                    <!-- Simplify progress before first text -->
                    <template v-if="isSimplifying && !inDiffReview">
                        <div
                            class="absolute inset-0 z-10 bg-default/50 backdrop-blur-[1px]"
                        />
                        <div
                            class="absolute top-0 inset-x-0 z-20 px-4 pt-3 border-b border-default bg-default/95 shadow-sm"
                        >
                            <SimplifyProgress
                                :progress="ws.simplifyProgress.value"
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

        <USlideover
            v-model:open="mobileRailOpen"
            :title="t('advisor.title')"
            side="right"
            :ui="{ body: 'p-0 sm:p-0' }"
        >
            <template #body>
                <div data-tour="threads-rail-mobile">
                    <Rail
                        :threads="ws.threads.value"
                        :active-thread-id="ws.activeThreadId.value"
                        :checking="ws.progress.value === 'checking'"
                        @open-pdf="onOpenPdf"
                    />
                </div>
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
