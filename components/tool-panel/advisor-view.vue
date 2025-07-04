<script lang="ts" setup>
import type {
    AdvisorDocumentDescription,
    AdvisorRuleViolation,
    ValidationResult,
} from "~/assets/models/advisor";
import { AdvisorService } from "~/assets/services/AdvisorService";
import AdvisorPdfViewer from "./advisor-pdf-viewer.client.vue";
import TextStatsView from "./text-stats-view.vue";

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

onMounted(() => {
    useServiceAsync(AdvisorService).then((service) => {
        advisorService.value = service;
    });
});

async function check() {
    if (advisorService.value === undefined) {
        return;
    }

    if (selectedDocs.value.length === 0) {
        return;
    }
    isLoading.value = true;
    addProgress("advisor-check", {
        title: t("advisor.checking"),
        icon: "i-lucide-check",
    });
    try {
        const result = await advisorService.value.validate(
            props.text,
            selectedDocs.value.map((doc) => doc.file),
        );

        validationResult.value = result;
    } catch (error) {
        console.error(error);

        if (error instanceof Error) {
            toast.add({
                title: t("advisor.error"),
                description: error.message,
                color: "error",
            });
        }
    } finally {
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
  <TextStatsView :text="props.text" class="mb-4" />

  <div v-if="advisorService" class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col h-full">
    <!-- Header section with subtle background and spacing -->
    <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded-md mb-4 flex-shrink-0">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
        {{ t('advisor.title') || 'Document Advisor' }}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
        {{ t('advisor.description') || 'Check your text against selected documents' }}
      </p>
      
      <!-- Document selector -->
      <div class="mb-4">
        <ToolPanelAdvisorDocSelect 
          :advisor-service="advisorService" 
          v-model="selectedDocs"
          class="mb-3"
        />
      </div>
      
      <!-- Check button with loading state -->
      <UButton 
        @click="check" 
        :disabled="selectedDocs.length == 0 || props.text.length < 3"
        :loading="isLoading"
        block
        color="primary"
        class="w-full flex justify-center items-center gap-2 transition-all duration-200 hover:shadow-lg"
      >
        <span v-if="!isLoading" class="i-lucide-check mr-1" aria-hidden="true"></span>
        {{ t('advisor.check') }}
      </UButton>
    </div>

    <!-- Results section - now with flex-grow to take remaining space -->
    <div v-if="validationResult" class="flex flex-col flex-grow overflow-hidden">
      <!-- Results header -->
      <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h4 class="font-medium text-gray-800 dark:text-gray-200">
          {{ t('advisor.results') || 'Results' }}
        </h4>
        <span class="px-2 py-1 text-xs rounded-full" 
          :class="validationResult.rules.length ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'">
          {{ $t('advisor.issues', validationResult.rules.length) }}
        </span>
      </div>

      <!-- No issues found message -->
      <div v-if="validationResult.rules.length === 0" class="text-center py-8 flex-grow flex items-center justify-center">
        <div class="text-center">
          <div class="i-lucide-check-circle text-3xl text-green-500 mx-auto mb-2"></div>
          <p class="text-gray-600 dark:text-gray-300">{{ t('advisor.noIssues') || 'No issues found!' }}</p>
        </div>
      </div>

      <!-- Issues list with scroll area now taking full height -->
      <div v-else class="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-grow">
        <div v-for="ruel in validationResult.rules" :key="ruel.name">
          <ToolPanelAdvisorRuleView 
            :rule="ruel" 
            @open-pdf="openPdfView"
            class="w-full"
          />
        </div>
      </div>
    </div>
    
    <!-- Placeholder when no results yet, also fills vertical space -->
    <div v-else-if="!isLoading" class="flex-grow flex items-center justify-center text-center p-8 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-4">
      <div>
        <div class="i-lucide-file-search text-4xl mb-3 mx-auto opacity-50"></div>
        <p>{{ t('advisor.noResultsYet') || 'Run a check to see results' }}</p>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else class="p-8 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-md h-full">
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
