<script lang="ts" setup>
import FleschScoreVisualization from "@/components/flesch-score-visualization.vue";
import { useTextStats } from "@/composables/text-stats";

const { t } = useI18n();

const props = defineProps<{
    text: string;
}>();

const text = computed(() => props.text);

const showDetails = ref(false);

const {
    charCount,
    wordCount,
    syllableCount,
    averageSentenceLength,
    averageSyllablesPerWord,
    fleschScore,
} = useTextStats(text);
</script>

<template>
  <div class="text-stats-container">

    
    <!-- Fancy Flesch Score Visualization -->
    <div class="bg-white border-1 border-gray-200 p-2 rounded-md">
      <FleschScoreVisualization :score="fleschScore" />

      <div class="flex justify-end mt-2">
        <UButton
          size="sm"
          :icon="showDetails ? 'i-lucide-square-dashed-kanban' : 'i-lucide-square-kanban'"
          variant="link"
          color="secondary"
          @click="showDetails = !showDetails"
        >
          {{ showDetails ? t('text-stats.hide-details') : t('text-stats.show-details') }}
        </UButton>
      </div>

      <div v-if="showDetails">
        <div class="basic-stats border-1 border-gray-200 p-4 rounded-md">
          <div class="stat-item">
            <span class="stat-label">{{ t('text-stats.character-count') }}:</span>
            <span class="stat-value">{{ charCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('text-stats.word-count') }}:</span>
            <span class="stat-value">{{ wordCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('text-stats.syllable-count') }}:</span>
            <span class="stat-value">{{ syllableCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('text-stats.average-sentence-length') }}:</span>
            <span class="stat-value">{{ averageSentenceLength }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('text-stats.average-syllables-per-word') }}:</span>
            <span class="stat-value">{{ averageSyllablesPerWord }}</span>
          </div>
        </div>
      </div>
    </div>   
  </div>
</template>

<style scoped>
.text-stats-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.flesch-score-container {
  background-color: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  padding: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.basic-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  background-color: #f8fafc;
  padding: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .basic-stats {
    grid-template-columns: 1fr;
  }
  
  .stat-item {
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
}
</style>