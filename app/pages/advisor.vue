<script lang="ts" setup>
import { ApiError } from "@dcc-bs/communication.bs.js";
import type { AdvisorRuleViolation } from "~/assets/models/advisor";
import type { FixThread } from "~~/shared/types/advisor";
import AdvisorPdfViewer from "~/components/tool-panel/AdvisorPdfViewer.client.vue";
import { useAdvisorStore } from "~/stores/advisor";

definePageMeta({ layout: false });

const { t } = useI18n();
const toast = useToast();
const overlay = useOverlay();
const store = useAdvisorStore();

const { docs, validate, fix, getDocFile } = useAdvisor();

const pdfModal = overlay.create(AdvisorPdfViewer);

const streamingPreview = ref("");
const checkAbort = ref<AbortController | null>(null);
const fixAbort = ref<AbortController | null>(null);

const canCheck = computed(
    () =>
        docs.value &&
        store.selectedDocIds.length > 0 &&
        store.selectedDocIds.length <= 5 &&
        store.text.trim().length >= 3 &&
        !store.isChecking,
);

/**
 * Sample text shown by default so the advisor has something to check on a
 * fresh visit. Deliberately exercises the dummy validator: a passive
 * construction, a nominal style, a filler phrase, a very long sentence and
 * a long compound noun.
 */
const EXAMPLE_TEXT = [
    "Die Umsetzung der digitalen Transformation in der öffentlichen Verwaltung wurde von den zuständigen Behörden als prioritäres Ziel definiert worden.",
    "Es wird davon ausgegangen, dass durch die Implementierung moderner Informationstechnologiesysteme und die damit einhergehende Automatisierung von Prozessabläufen eine signifikante Effizienzsteigerung erreicht werden kann, die über alle Behördenebenen hinweg wirksam wird.",
    "Die Bürgerinnen und Bürger sollen in die Lage versetzt werden, Verwaltungsangelegenheiten zunehmend auf digitalem Wege abzuwickeln, ohne dass ein persönlicher Besuch der entsprechenden Dienststellen erforderlich ist.",
    "Trotz der unbestreitbaren Vorteile, die mit dieser digitalen Neuausrichtung einhergehen, müssen jedoch auch die Bedenken hinsichtlich des Datenschutzes in angemessener Weise berücksichtigt werden.",
    "Die Erfahrungen anderer europäischer Länder zeigen, dass eine schrittweise Einführung digitaler Dienste am erfolgreichsten ist.",
].join("\n");

const hasText = computed(() => store.text.trim().length > 0);

function insertExample(): void {
    store.setText(EXAMPLE_TEXT);
    store.selectDocs(docs.value.slice(0, 2).map((doc) => doc.id));
}

onMounted(async () => {
    // Pre-fill the editor with the sample text on a fresh (empty) visit.
    if (store.text.trim() === "") {
        store.setText(EXAMPLE_TEXT);
    }
});

onBeforeUnmount(() => {
    checkAbort.value?.abort();
    fixAbort.value?.abort();
});

function ruleKey(rule: AdvisorRuleViolation): string {
    return [
        rule.collection ?? "",
        rule.file_name ?? "",
        rule.page_number ?? "",
        rule.name ?? "",
        rule.reason ?? "",
        rule.source ?? "",
    ].join("|");
}

async function check(): Promise<void> {
    if (!canCheck.value) {
        return;
    }

    checkAbort.value?.abort();
    const controller = new AbortController();
    checkAbort.value = controller;

    store.isChecking = true;
    store.checkedCount = 0;
    store.totalCount = 0;
    store.originalText = store.text;

    const aggregated: AdvisorRuleViolation[] = [];
    const seen = new Set<string>();

    try {
        const stream = validate(
            store.text,
            store.selectedDocIds,
            controller.signal,
        );

        for await (const chunk of stream) {
            if (chunk.checked !== undefined) {
                store.checkedCount = chunk.checked;
            }
            if (chunk.total !== undefined) {
                store.totalCount = chunk.total;
            }
            for (const rule of chunk.rules ?? []) {
                const key = ruleKey(rule);
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                aggregated.push(rule);
            }
        }

        store.loadViolations(aggregated);
        store.setPhase("review");

        if (aggregated.length === 0) {
            toast.add({
                title: t("advisor.noIssues"),
                color: "success",
                icon: "i-lucide-check-circle",
            });
        }
    } catch (error: unknown) {
        if (error instanceof ApiError && error.errorId === "request_aborted") {
            return;
        }
        console.error(error);
        toast.add({
            title: t("advisor.error"),
            description: error instanceof Error ? error.message : "",
            color: "error",
        });
    } finally {
        if (checkAbort.value === controller) {
            checkAbort.value = null;
        }
        store.isChecking = false;
    }
}

async function apply(): Promise<void> {
    if (store.toFixThreads.length === 0) {
        return;
    }

    fixAbort.value?.abort();
    const controller = new AbortController();
    fixAbort.value = controller;

    store.beginApply();
    streamingPreview.value = "";

    const payload: FixThread[] = store.toFixThreads.map((thread) => ({
        source: thread.source ?? "",
        proposal: thread.proposal,
        reason: thread.reason,
        notes: thread.notes.map((n) => n.text),
    }));

    try {
        let finalText = "";
        for await (const acc of fix(store.text, payload, controller.signal)) {
            finalText = acc;
            streamingPreview.value = acc;
        }

        if (!finalText.trim() || finalText.trim() === store.text.trim()) {
            toast.add({
                title: t("advisor.noChangesCouldBeApplied"),
                color: "warning",
                icon: "i-lucide-alert-circle",
            });
            store.setPhase("review");
            return;
        }

        store.setCorrectedText(finalText);
    } catch (error: unknown) {
        if (error instanceof ApiError && error.errorId === "request_aborted") {
            return;
        }
        console.error(error);
        toast.add({
            title: t("advisor.error"),
            description: error instanceof Error ? error.message : "",
            color: "error",
        });
        store.setPhase("review");
    } finally {
        if (fixAbort.value === controller) {
            fixAbort.value = null;
        }
        streamingPreview.value = "";
    }
}

function onDiffApply(text: string): void {
    store.commitApply(text);
    toast.add({
        title: t("advisor.changesApplied"),
        color: "success",
        icon: "i-lucide-check-circle",
    });
}

async function openPdf(
    thread: import("~/assets/models/advisor").AdvisorThread,
): Promise<void> {
    if (!thread.file_name) {
        return;
    }
    try {
        const blob = await getDocFile(thread.file_name);
        pdfModal.open({
            file: blob,
            page: thread.page_number ?? 1,
            fileName: thread.file_name,
            onClose: () => pdfModal.close(),
        });
    } catch (error: unknown) {
        console.error(error);
        toast.add({ title: t("advisor.error"), color: "error" });
    }
}

const phase = computed(() => store.phase);
const showSplit = computed(() =>
    ["edit", "review", "done"].includes(phase.value),
);
</script>

<template>
    <div class="h-screen flex flex-col bg-muted/20">
        <header
            class="h-14 shrink-0 flex items-center justify-between px-4 border-b border-default bg-default"
        >
            <div class="flex items-center gap-3">
                <UButton
                    icon="i-lucide-arrow-left"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    to="/"
                    :label="t('tools.rewrite')"
                />
                <span class="w-px h-5 bg-default" />
                <span
                    class="flex items-center gap-1.5 font-semibold text-toned"
                >
                    <UIcon name="i-lucide-sparkles" class="text-primary" />
                    TextMate Advisor
                </span>
            </div>
            <div
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                :class="
                    store.toFixThreads.length
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary/10 text-secondary'
                "
            >
                <UIcon name="i-lucide-message-circle" class="text-sm" />
                {{
                    store.threads.length
                        ? `${store.toFixThreads.length} ${t("advisor.toFix")}`
                        : t("advisor.allClear")
                }}
            </div>
        </header>

        <!-- EDIT / REVIEW / DONE: editor + rail split -->
        <main
            v-if="showSplit"
            class="flex-1 grid overflow-hidden"
            style="grid-template-columns: 1fr 380px"
        >
            <section class="overflow-hidden border-r border-default">
                <AdvisorEditor />
            </section>

            <aside class="overflow-hidden bg-default">
                <!-- Edit phase: doc select + check controls -->
                <div
                    v-if="phase === 'edit'"
                    class="p-3 border-b border-default overflow-y-auto"
                >
                    <p class="text-sm font-semibold text-toned mb-1">
                        {{ t("advisor.selectDocsTitle") }}
                    </p>
                    <p class="text-xs text-muted mb-3">
                        {{ t("advisor.description") }}
                    </p>
                    <AdvisorDocSelectGrid :docs="docs" />

                    <UButton
                        block
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-file-text"
                        class="mt-3"
                        :label="t('advisor.insertExample')"
                        @click="insertExample"
                    />

                    <div v-if="store.isChecking" class="mt-3 space-y-1">
                        <div class="flex justify-between text-xs text-muted">
                            <span>{{ t("advisor.checkingProgress") }}</span>
                            <span
                                >{{ store.checkedCount }} /
                                {{ store.totalCount }}</span
                            >
                        </div>
                        <UProgress
                            v-if="store.totalCount > 0"
                            :model-value="store.checkedCount"
                            :max="store.totalCount"
                            size="sm"
                        />
                        <UProgress v-else size="sm" />
                    </div>

                    <UButton
                        block
                        color="primary"
                        icon="i-lucide-search-check"
                        class="mt-3"
                        :loading="store.isChecking"
                        :disabled="!canCheck"
                        :label="t('advisor.check')"
                        @click="check"
                    />
                </div>

                <!-- Review phase: thread rail + apply -->
                <div v-else-if="phase === 'review'" class="h-full">
                    <AdvisorRail @apply="apply" @open-pdf="openPdf" />
                </div>

                <!-- Done phase: terminal state after apply -->
                <div
                    v-else
                    class="h-full flex flex-col items-center justify-center text-center p-6"
                >
                    <UIcon
                        name="i-lucide-check-circle"
                        class="text-5xl text-secondary mb-3"
                    />
                    <h3 class="text-base font-semibold mb-1">
                        {{ t("advisor.allChangesApplied") }}
                    </h3>
                    <p class="text-sm text-muted mb-4">
                        {{ t("advisor.allChangesAppliedHint") }}
                    </p>
                    <div class="flex flex-col gap-2 w-full max-w-[220px]">
                        <UButton
                            block
                            color="primary"
                            icon="i-lucide-rotate-ccw"
                            :label="t('advisor.recheck')"
                            @click="check"
                        />
                        <UButton
                            block
                            variant="soft"
                            color="neutral"
                            icon="i-lucide-pencil"
                            :label="t('advisor.editText')"
                            @click="store.resetToEdit()"
                        />
                    </div>
                </div>
            </aside>
        </main>

        <!-- DIFF phase: full-bleed diff viewer -->
        <main
            v-else-if="phase === 'diff'"
            class="flex-1 overflow-hidden bg-muted/20"
        >
            <AdvisorDiffViewer
                :original-text="store.originalText"
                :corrected-text="store.correctedText ?? ''"
                @apply="onDiffApply"
                @cancel="store.cancelApply()"
            />
        </main>

        <!-- Applying overlay -->
        <div
            v-if="store.isFixing"
            class="fixed inset-0 z-50 grid place-items-center bg-default/90"
        >
            <div class="text-center">
                <UIcon
                    name="i-lucide-loader-circle"
                    class="animate-spin text-3xl text-primary mb-3"
                />
                <p class="text-sm text-toned">{{ t("advisor.applying") }}</p>
                <p class="text-xs text-muted mt-1">
                    {{ t("advisor.applyingHint") }}
                </p>
            </div>
        </div>
    </div>
</template>
