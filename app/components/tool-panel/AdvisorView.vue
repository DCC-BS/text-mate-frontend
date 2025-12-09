<script lang="ts" setup>
import { ApiError } from "@dcc-bs/communication.bs.js";
import { AnimatePresence, motion } from "motion-v";
import type {
    AdvisorDocumentDescription,
    AdvisorRuleViolation,
    ValidationResult,
} from "~/assets/models/advisor";
import { AdvisorService } from "~/assets/services/AdvisorService";
import AdvisorPdfViewer from "./AdvisorPdfViewer.client.vue";

interface ToolPanelAdvisorViewProps {
    text: string;
}

const props = defineProps<ToolPanelAdvisorViewProps>();

const { t } = useI18n();
const { addProgress, removeProgress } = useUseProgressIndication();
const toast = useToast();
const isLoading = ref(false);
const overlay = useOverlay();

const advisorService = ref<AdvisorService>();
const selectedDocs = ref<AdvisorDocumentDescription[]>([]);
const validationResult = ref<ValidationResult>();
const selectedRuleIndex = ref<number>(0);
const currentValidationAbort = ref<AbortController | null>(null);
const rules = computed(() => validationResult.value?.rules ?? []);
const ruleCount = computed(() => rules.value.length);
const currentRule = computed<AdvisorRuleViolation | undefined>(() => {
    if (ruleCount.value === 0) {
        return undefined;
    }

    return rules.value[selectedRuleIndex.value];
});

watch(
    () => ruleCount.value,
    (newLength) => {
        if (newLength === 0) {
            selectedRuleIndex.value = 0;
            return;
        }

        if (selectedRuleIndex.value > newLength - 1) {
            selectedRuleIndex.value = newLength - 1;
        }
    },
);

function createRuleKey(rule: AdvisorRuleViolation): string {
    return [
        rule.file_name ?? "",
        rule.page_number ?? "",
        rule.name ?? "",
        rule.description ?? "",
        rule.reason ?? "",
    ].join("|");
}

function changeRuleIndex(delta: number) {
    if (ruleCount.value === 0) {
        return;
    }

    const nextIndex = selectedRuleIndex.value + delta;
    selectedRuleIndex.value = Math.min(
        Math.max(0, nextIndex),
        ruleCount.value - 1,
    );
}

function ignoreRule() {
    if (!validationResult.value || !validationResult.value.rules) {
        return;
    }

    validationResult.value.rules.splice(selectedRuleIndex.value, 1);
}

onMounted(() => {
    useServiceAsync(AdvisorService).then((service) => {
        advisorService.value = service;
    });
});

onBeforeUnmount(() => {
    currentValidationAbort.value?.abort();
});

async function check() {
    if (advisorService.value === undefined) {
        return;
    }

    if (selectedDocs.value.length === 0) {
        return;
    }

    currentValidationAbort.value?.abort();

    isLoading.value = true;
    selectedRuleIndex.value = 0;
    const abortController = new AbortController();
    currentValidationAbort.value = abortController;
    const aggregatedRules: AdvisorRuleViolation[] = [];
    const seenRuleKeys = new Set<string>();
    let emittedAnyChunk = false;

    addProgress("advisor-check", {
        title: t("advisor.checking"),
        icon: "i-lucide-check",
    });

    try {
        const stream = advisorService.value.validate(
            props.text,
            selectedDocs.value.map((doc) => doc.file),
            abortController.signal,
        );

        for await (const chunk of stream) {
            emittedAnyChunk = true;

            if (!chunk?.rules?.length) {
                if (!validationResult.value) {
                    validationResult.value = { rules: [] };
                }
                continue;
            }

            let rulesChanged = false;

            for (const rule of chunk.rules) {
                const key = createRuleKey(rule);
                if (seenRuleKeys.has(key)) {
                    continue;
                }

                seenRuleKeys.add(key);
                aggregatedRules.push(rule);
                rulesChanged = true;
            }

            if (rulesChanged || !validationResult.value) {
                validationResult.value = {
                    rules: aggregatedRules.map((rule) => ({ ...rule })),
                };
            }
        }

        if (!emittedAnyChunk) {
            validationResult.value = { rules: [] };
        } else if (!validationResult.value) {
            validationResult.value = {
                rules: aggregatedRules.map((rule) => ({ ...rule })),
            };
        }
    } catch (error) {
        console.error(error);

        if (error instanceof ApiError && error.errorId === "request_aborted") {
            return;
        }

        if (error instanceof Error) {
            toast.add({
                title: t("advisor.error"),
                description: error.message,
                color: "error",
            });
        }
    } finally {
        if (currentValidationAbort.value === abortController) {
            currentValidationAbort.value = null;
        }
        removeProgress("advisor-check");
        isLoading.value = false;
    }
}

const modal = overlay.create(AdvisorPdfViewer);

async function openPdfView(ruel: AdvisorRuleViolation) {
    if (!advisorService.value) {
        return;
    }

    const blob = await advisorService.value?.getDocFile(ruel.file_name);

    modal.open({
        file: blob,
        page: ruel.page_number,
        fileName: ruel.file_name,
        onClose: () => modal.close(),
    });
}
</script>

<template>
    <div v-if="advisorService" class="p-2 flex flex-col h-full">
        <!-- Header section with subtle background and spacing -->
        <div class="mb-4 shrink-0">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                {{ t('advisor.title') || 'Document Advisor' }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {{ t('advisor.description') || 'Check your text against selected documents' }}
            </p>

            <!-- Document selector -->
            <div class="mb-4">
                <ToolPanelAdvisorDocSelect :advisor-service="advisorService" v-model="selectedDocs" class="mb-3" />
            </div>

            <!-- Check button with loading state -->
            <UButton @click="check" :disabled="selectedDocs.length == 0 || props.text.length < 3" :loading="isLoading"
                block color="primary"
                class="w-full flex justify-center items-center gap-2 transition-all duration-200 hover:shadow-lg">
                <span v-if="!isLoading" class="i-lucide-check mr-1" aria-hidden="true"></span>
                {{ t('advisor.check') }}
            </UButton>
        </div>

        <div v-if="validationResult" class="flex flex-col">
            <!-- Results header -->
            <div
                class="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <h4 class="font-medium text-gray-800 dark:text-gray-200">
                    {{ t('advisor.results') || 'Results' }}
                </h4>
                <span class="px-2 py-1 text-xs rounded-full"
                    :class="validationResult.rules.length ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'">
                    {{ t('advisor.issues', validationResult.rules.length) }}
                </span>
            </div>
        </div>

        <div class="grow flex flex-col">
            <div v-if="currentRule" class="relative">
                <AnimatePresence mode="popLayout">
                    <div class="flex gap-2 absolute top-0 right-0 z-10">
                        <UButton icon="i-lucide-eye-off" variant="ghost" color="neutral" :title="t('advisor.ignore')"
                            @click="ignoreRule" />
                        <UButton icon="i-lucide-chevron-left" variant="link" :disabled="selectedRuleIndex === 0"
                            @click="changeRuleIndex(-1)"></UButton>
                        <UButton icon="i-lucide-chevron-right" variant="link"
                            :disabled="selectedRuleIndex >= ruleCount - 1" @click="changeRuleIndex(1)"></UButton>
                    </div>
                    <motion.div class="flex justify-between" :key="`rule-${selectedRuleIndex}`"
                        :initial="{ opacity: 0, x: -20 }" :animate="{ opacity: 1, x: 0 }" :exit="{ opacity: 0, x: 20 }">
                        <div class="space-y-4">
                            <div>
                                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                    {{ currentRule.name }}
                                </h2>
                                <p class="text-base leading-relaxed text-gray-700 dark:text-gray-200">
                                    {{ currentRule.description }}
                                </p>
                            </div>

                            <div class="grid gap-4">
                                <div v-if="currentRule.reason"
                                    class="p-4 rounded-lg border border-amber-200/70 dark:border-amber-400/20 bg-amber-50/60 dark:bg-amber-500/10">
                                    <p class="text-xs uppercase tracking-wide text-amber-800 dark:text-amber-200 mb-1">
                                        {{ t('advisor.reason') }}
                                    </p>
                                    <p class="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                                        {{ currentRule.reason }}
                                    </p>
                                </div>

                                <div v-if="currentRule.proposal"
                                    class="p-4 rounded-lg border border-emerald-200/70 dark:border-emerald-400/20 bg-emerald-50/70 dark:bg-emerald-500/10">
                                    <p
                                        class="text-xs uppercase tracking-wide text-emerald-800 dark:text-emerald-200 mb-1">
                                        {{ t('advisor.proposal') }}
                                    </p>
                                    <p class="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                                        {{ currentRule.proposal }}
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
                                @click="openPdfView(currentRule)" style="cursor: pointer;">
                                <UIcon name="i-lucide-file-search" class="mr-1 shrink-0" />
                                <span class="truncate">{{ currentRule.file_name }}</span>
                                <template v-if="currentRule.page_number">
                                    <span class="mx-1 text-gray-400 dark:text-gray-500">•</span>
                                    <UIcon name="i-lucide-bookmark" class="mr-1 shrink-0" />
                                    <span>{{ t('advisor.page') }} {{ currentRule.page_number }}</span>
                                </template>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div v-else-if="validationResult && validationResult.rules.length === 0">
                <div class="text-center">
                    <div class="i-lucide-check-circle text-3xl text-green-500 mx-auto mb-2"></div>
                    <p class="text-gray-600 dark:text-gray-300">{{ t('advisor.noIssues') || 'No issues found!' }}</p>
                </div>
            </div>

            <div v-else-if="!isLoading"
                class="grow flex items-center justify-center text-center p-8 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-4">
                <div>
                    <div class="i-lucide-file-search text-4xl mb-3 mx-auto opacity-50"></div>
                    <p>{{ t('advisor.noResultsYet') || 'Run a check to see results' }}</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading state -->
    <div v-else
        class="p-8 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-md h-full">
        <div class="i-lucide-loader animate-spin text-2xl text-gray-400 mb-3"></div>
        <p class="text-gray-600 dark:text-gray-300">{{ t("loading") }}</p>
    </div>
</template>

<style>
/* Custom scrollbar styles for results list */
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
}

custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2);
}

/* Dark mode scrollbar */
.dark .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
}
</style>
