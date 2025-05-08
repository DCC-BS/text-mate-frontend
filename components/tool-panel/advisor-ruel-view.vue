<script lang="ts" setup>
import type { AdvisorRuleViolation } from "~/assets/models/advisor";

const props = defineProps<{
    ruel: AdvisorRuleViolation;
}>();

const emit = defineEmits<{
    openPdf: [AdvisorRuleViolation];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="bg-gray-100 dark:bg-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div class="flex flex-col space-y-3">
      <!-- Rule name header -->
      <div class="flex items-center">
        <UIcon name="i-lucide-alert-triangle" class="text-amber-500 mr-2 flex-shrink-0" />
        <h3 class="text-lg font-bold">{{ props.ruel.name }}</h3>
      </div>
      
      <!-- Rule description with info icon -->
      <div class="flex items-start space-x-2">
        <UIcon name="i-lucide-badge-info" class="text-blue-500 mt-1 flex-shrink-0" />
        <p class="text-sm">{{ props.ruel.description }}</p>
      </div>
      
      <!-- Example with eyedropper icon -->
      <div v-if="props.ruel.example" class="flex items-start space-x-2 bg-gray-200 dark:bg-slate-700 p-2 rounded">
        <UIcon name="i-lucide-eyedropper" class="text-purple-500 mt-1 flex-shrink-0" />
        <p class="text-sm italic">{{ props.ruel.example }}</p>
      </div>
      
      <!-- Reason with lightbulb icon -->
      <div class="flex items-start space-x-2">
        <UIcon name="i-lucide-lightbulb" class="text-yellow-500 mt-1 flex-shrink-0" />
        <div>
          <p class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ t('advisor.reason') }}:</p>
          <p class="text-sm">{{ props.ruel.reason }}</p>
        </div>
      </div>
      
      <!-- Proposal with check-check icon -->
      <div class="flex items-start space-x-2 bg-green-100 dark:bg-green-900/20 p-2 rounded">
        <UIcon name="i-lucide-check-check" class="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
        <div>
          <p class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ t('advisor.proposal') || 'Proposal' }}:</p>
          <p class="text-sm font-medium">{{ props.ruel.proposal }}</p>
        </div>
      </div>
      
      <!-- Source info with file and page number -->
      <div class="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400" @click="emit('openPdf', props.ruel)" style="cursor: pointer;">
        <UIcon name="i-lucide-file-search" class="mr-1 flex-shrink-0" />
        <span>{{ props.ruel.file_name }}</span>
        <template v-if="props.ruel.page_number">
          <span class="mx-1">•</span>
          <UIcon name="i-lucide-bookmark" class="mr-1 flex-shrink-0" />
          <span>{{ t('advisor.page') }} {{ props.ruel.page_number }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style>
/* Add transitions for hover effects */
.hover-shadow {
  transition: box-shadow 0.3s ease;
}
.hover-shadow:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>