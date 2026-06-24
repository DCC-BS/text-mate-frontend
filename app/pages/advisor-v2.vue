<script lang="ts" setup>
import { ApiError } from "@dcc-bs/communication.bs.js";
import type { AdvisorDocumentDescription } from "~/assets/models/advisor";
import { AdvisorService } from "~/assets/services/AdvisorService";
import { AdvisorV2Service } from "~/assets/services/AdvisorV2Service";
import AdvisorPdfViewer from "~/components/tool-panel/AdvisorPdfViewer.client.vue";
import type {
    AdvisorCheckViolation,
    AdvisorFixThread,
    AdvisorRange,
    AdvisorThread,
    AdvisorThreadStatus,
} from "~/types/advisorV2";

type AdvisorTool = "rewrite" | "advisor";
type AdvisorPhase = "review" | "checking" | "applying" | "diff" | "done";

const DEFAULT_TEXT =
    "Der Mitarbeiter schreibt dem Bürger das er schneller antworten muss. Auch der Sachbearbeiter sollte den Antragsteller zeitnah informieren.";

const { t } = useI18n();
const toast = useToast();
const overlay = useOverlay();
const logger = useLogger();
const { addProgress, removeProgress } = useUseProgressIndication();

// --- Services -----------------------------------------------------------
const advisorService = ref<AdvisorService>();
const checkService = ref<AdvisorV2Service>();
const pdfModal = overlay.create(AdvisorPdfViewer);

onMounted(() => {
    useServiceAsync(AdvisorService).then((service) => {
        advisorService.value = service;
    });
    useServiceAsync(AdvisorV2Service).then((service) => {
        checkService.value = service;
    });
});

// --- State --------------------------------------------------------------
const tool = ref<AdvisorTool>("advisor");
const phase = ref<AdvisorPhase>("review");
const documentText = ref(DEFAULT_TEXT);
const selectedDocs = ref<AdvisorDocumentDescription[]>([]);

const originalText = ref("");
const correctedText = ref("");
const checkAbort = ref<AbortController | null>(null);
const fixAbort = ref<AbortController | null>(null);

const {
    threads,
    focusedId,
    toFixCount,
    skippedCount,
    setViolations,
    focusThread,
    setStatus,
    deleteThread,
    addUserThread,
    addNote,
    updateNote,
    deleteNote,
    clear,
} = useAdvisorThreads();

const {
    hunks: diffHunks,
    changeCount,
    acceptedCount,
    finalText,
    setAccepted,
    acceptAll,
    rejectAll,
} = useAdvisorDiff(originalText, correctedText);

// Default to the sample collection so the dummy backend returns violations.
watch(advisorService, (service) => {
    if (service && selectedDocs.value.length === 0) {
        const sample =
            service.getDocs().find((d) => d.id === "beispiel-collection") ??
            service.getDocs()[0];
        if (sample) {
            selectedDocs.value = [sample];
        }
    }
});

const isAdvisor = computed(() => tool.value === "advisor");
const showReview = computed(
    () =>
        isAdvisor.value &&
        (phase.value === "review" ||
            phase.value === "checking" ||
            phase.value === "done"),
);
const interactive = computed(() => phase.value === "review");
const problemBadge = computed(() => {
    if (phase.value === "done") {
        return { text: t("advisorV2.revised"), tone: "green" as const };
    }
    if (threads.value.length === 0) {
        return { text: t("advisorV2.noProblems"), tone: "green" as const };
    }
    return {
        text: t("advisorV2.problems", threads.value.length),
        tone: "amber" as const,
    };
});

const canCheck = computed(
    () =>
        !!checkService.value &&
        selectedDocs.value.length > 0 &&
        selectedDocs.value.length <= 5 &&
        documentText.value.trim().length >= 3 &&
        phase.value !== "checking",
);

// --- Check flow ---------------------------------------------------------
async function runCheck(): Promise<void> {
    if (!checkService.value || selectedDocs.value.length === 0) {
        return;
    }

    checkAbort.value?.abort();
    const abort = new AbortController();
    checkAbort.value = abort;

    clear();
    phase.value = "checking";
    correctedText.value = "";
    addProgress("advisor-v2-check", {
        title: t("advisorV2.checking"),
        icon: "i-lucide-check",
    });

    const collected: AdvisorCheckViolation[] = [];
    const seen = new Set<string>();

    try {
        const stream = checkService.value.check(
            documentText.value,
            selectedDocs.value.map((doc) => doc.id),
            abort.signal,
        );

        for await (const chunk of stream) {
            for (const violation of chunk.violations) {
                const key = `${violation.range.start}:${violation.range.end}:${violation.rule_name}:${violation.file_name}:${violation.page_number}`;
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                collected.push(violation);
            }
        }

        setViolations(collected);
        phase.value = "review";
    } catch (error) {
        if (error instanceof ApiError && error.errorId === "request_aborted") {
            return;
        }
        logger.error(error, "Advisor v2 check failed");
        toast.add({
            title: t("advisorV2.error"),
            description: error instanceof Error ? error.message : undefined,
            color: "error",
        });
        phase.value = "review";
    } finally {
        if (checkAbort.value === abort) {
            checkAbort.value = null;
        }
        removeProgress("advisor-v2-check");
    }
}

// --- Fix flow -----------------------------------------------------------
function toFixThreads(): AdvisorFixThread[] {
    return threads.value
        .filter((thread) => thread.status === "to-fix")
        .map((thread) => ({
            snippet: documentText.value.slice(
                thread.range.start,
                thread.range.end,
            ),
            rule_name: thread.rule_name,
            reason: thread.reason,
            proposal: thread.proposal,
            notes: thread.notes.map((note) => note.text),
        }));
}

async function applyFix(): Promise<void> {
    if (!checkService.value || toFixCount.value === 0) {
        return;
    }

    fixAbort.value?.abort();
    const abort = new AbortController();
    fixAbort.value = abort;

    originalText.value = documentText.value;
    correctedText.value = "";
    phase.value = "applying";

    let result = "";
    try {
        const stream = checkService.value.fix(
            documentText.value,
            toFixThreads(),
            abort.signal,
        );
        for await (const chunk of stream) {
            result += chunk;
        }
        correctedText.value = result;
        phase.value = "diff";
    } catch (error) {
        if (error instanceof ApiError && error.errorId === "request_aborted") {
            return;
        }
        logger.error(error, "Advisor v2 fix failed");
        toast.add({
            title: t("advisorV2.error"),
            description: error instanceof Error ? error.message : undefined,
            color: "error",
        });
        phase.value = "review";
    } finally {
        if (fixAbort.value === abort) {
            fixAbort.value = null;
        }
    }
}

function confirmDiff(): void {
    documentText.value = finalText.value;
    clear();
    correctedText.value = "";
    phase.value = "done";
    toast.add({
        title: t("advisorV2.applied"),
        color: "success",
        icon: "i-lucide-check",
    });
}

function rejectDiff(): void {
    correctedText.value = "";
    phase.value = "review";
}

// --- Thread interactions ------------------------------------------------
function onSetStatus(id: string, status: AdvisorThreadStatus): void {
    setStatus(id, status);
}

function onAddComment(range: AdvisorRange, text: string): void {
    addUserThread(range, text);
}

async function onOpenPdf(thread: AdvisorThread): Promise<void> {
    if (!advisorService.value || !thread.file_name) {
        return;
    }
    try {
        const blob = await advisorService.value.getDocFile(thread.file_name);
        pdfModal.open({
            file: blob,
            page: thread.page_number,
            fileName: thread.file_name,
            onClose: () => pdfModal.close(),
        });
    } catch (error) {
        logger.error(error, "Advisor v2: failed to open PDF");
    }
}

function selectTool(next: AdvisorTool): void {
    tool.value = next;
    focusThread(null);
}

onBeforeUnmount(() => {
    checkAbort.value?.abort();
    fixAbort.value?.abort();
});
</script>

<template>
    <div class="flex h-[calc(100vh-1px)] flex-col bg-white">
        <!-- Header -->
        <header
            class="flex h-[58px] shrink-0 items-center justify-between border-b border-gray-200 px-6"
        >
            <div class="flex items-center gap-2.5">
                <UIcon name="i-lucide-book-type" class="size-6 text-gray-900" />
                <span class="text-[21px] font-bold tracking-tight text-gray-900"
                    >TextMate</span
                >
                <span
                    class="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700"
                    >Advisor v2</span
                >
            </div>
            <ULink
                to="/"
                class="text-[13px] text-gray-600 underline hover:text-gray-900"
            >
                {{ t("advisorV2.backToClassic") }}
            </ULink>
        </header>

        <!-- Tab bar -->
        <div class="shrink-0 border-b border-gray-200 px-6 py-2.5">
            <div class="flex items-center justify-between gap-4">
                <div class="flex gap-1.5">
                    <button
                        type="button"
                        class="rounded-[15px] px-4 py-1.5 text-[15px] font-medium transition-colors"
                        :class="
                            tool === 'rewrite'
                                ? 'bg-purple-100 text-purple-700'
                                : 'text-gray-600 hover:bg-gray-50'
                        "
                        @click="selectTool('rewrite')"
                    >
                        {{ t("advisorV2.tabRewrite") }}
                    </button>
                    <button
                        type="button"
                        class="rounded-[15px] px-4 py-1.5 text-[15px] font-medium transition-colors"
                        :class="
                            tool === 'advisor'
                                ? 'bg-purple-100 text-purple-700'
                                : 'text-gray-600 hover:bg-gray-50'
                        "
                        @click="selectTool('advisor')"
                    >
                        {{ t("advisorV2.tabAdvisor") }}
                    </button>
                </div>

                <div
                    v-if="showReview"
                    class="flex items-center gap-3 text-[13px]"
                >
                    <div class="w-[260px]">
                        <ToolPanelAdvisorDocSelect
                            v-if="advisorService"
                            v-model="selectedDocs"
                            :advisor-service="advisorService"
                        />
                    </div>
                    <UButton
                        color="primary"
                        :loading="phase === 'checking'"
                        :disabled="!canCheck"
                        icon="i-lucide-check"
                        @click="runCheck"
                    >
                        {{ t("advisorV2.check") }}
                    </UButton>
                    <span
                        class="rounded-full px-2.5 py-1 text-[12.5px] font-semibold"
                        :class="
                            problemBadge.tone === 'green'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                        "
                    >
                        {{ problemBadge.text }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Main area -->
        <div class="relative flex min-h-0 flex-1 flex-col">
            <!-- Rewrite (plain editor for comparison/input) -->
            <div v-if="tool === 'rewrite'" class="flex min-h-0 flex-1">
                <div class="flex-1 p-7">
                    <textarea
                        v-model="documentText"
                        class="size-full resize-none text-[19px] leading-[1.7] text-gray-900 outline-none"
                    />
                </div>
                <div
                    class="w-[360px] shrink-0 border-l border-gray-200 bg-gray-50 p-6 text-[14px] leading-[1.6] text-gray-600"
                >
                    <i18n-t keypath="advisorV2.rewriteHint" tag="span">
                        <template #tab>
                            <strong class="text-purple-700"
                                >{{ t("advisorV2.tabAdvisor") }}</strong
                            >
                        </template>
                    </i18n-t>
                </div>
            </div>

            <!-- Review surface -->
            <AdvisorV2Review
                v-else-if="showReview"
                :threads="threads"
                :focused-id="focusedId"
                :document-text="documentText"
                :interactive="interactive"
                :done="phase === 'done'"
                @focus="focusThread"
                @set-status="onSetStatus"
                @delete-thread="deleteThread"
                @add-reply="addNote"
                @update-note="updateNote"
                @delete-note="deleteNote"
                @add-comment="onAddComment"
                @open-pdf="onOpenPdf"
            />

            <!-- Diff preview -->
            <AdvisorV2DiffViewer
                v-else-if="phase === 'diff'"
                :hunks="diffHunks"
                :change-count="changeCount"
                :accepted-count="acceptedCount"
                @set-accepted="setAccepted"
                @accept-all="acceptAll"
                @reject-all="rejectAll"
            />

            <!-- Applying overlay -->
            <div
                v-if="phase === 'applying'"
                class="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-[1px]"
            >
                <div
                    class="flex flex-col items-center gap-3.5 rounded-xl border border-gray-200 bg-white px-9 py-7 shadow-lg"
                >
                    <UIcon
                        name="i-lucide-rotate-ccw"
                        class="size-6 animate-spin text-purple-600"
                    />
                    <div class="text-[14.5px] font-semibold text-gray-800">
                        {{ t("advisorV2.applyingHint") }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer CTA -->
        <footer
            v-if="isAdvisor"
            class="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-2.5"
        >
            <template v-if="phase === 'review' && threads.length > 0">
                <span class="mr-auto text-[13px] text-gray-500">
                    {{ t("advisorV2.footerReview", {
                            fix: toFixCount,
                            skip: skippedCount,
                        }) }}
                </span>
                <UButton
                    color="primary"
                    :disabled="toFixCount === 0"
                    @click="applyFix"
                >
                    {{ toFixCount > 0
                            ? t("advisorV2.reviseWithCount", { n: toFixCount })
                            : t("advisorV2.revise") }}
                </UButton>
            </template>

            <template v-else-if="phase === 'diff'">
                <span class="mr-auto text-[13px] text-gray-500">
                    {{ t("advisorV2.diffSummary", {
                            accepted: acceptedCount,
                            total: changeCount,
                        }) }}
                </span>
                <UButton color="neutral" variant="outline" @click="rejectDiff">
                    {{ t("advisorV2.discard") }}
                </UButton>
                <UButton color="primary" @click="confirmDiff">
                    {{ t("advisorV2.apply") }}
                </UButton>
            </template>

            <template v-else-if="phase === 'done'">
                <span class="mr-auto text-[13px] text-gray-500">
                    {{ t("advisorV2.footerDone") }}
                </span>
                <UButton
                    color="primary"
                    :disabled="!canCheck"
                    @click="runCheck"
                >
                    {{ t("advisorV2.recheck") }}
                </UButton>
            </template>
        </footer>
    </div>
</template>
