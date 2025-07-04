<script lang="ts" setup>
import FleschScoreVisualization from "@/components/flesch-score-visualization.vue";
import { useTextStats } from "@/composables/text-stats";

const props = defineProps<{
    text: string;
}>();

const text = computed(() => props.text);
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
    <div class="basic-stats">
      <div class="stat-item">
        <span class="stat-label">Character Count:</span>
        <span class="stat-value">{{ charCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Word Count:</span>
        <span class="stat-value">{{ wordCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Syllable Count:</span>
        <span class="stat-value">{{ syllableCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Average Sentence Length:</span>
        <span class="stat-value">{{ averageSentenceLength }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Average Syllables per Word:</span>
        <span class="stat-value">{{ averageSyllablesPerWord }}</span>
      </div>
    </div>
    
    <!-- Fancy Flesch Score Visualization -->
    <FleschScoreVisualization :score="fleschScore" />
  </div>
</template>



<style scoped>
.text-stats-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.basic-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e2e8f0;
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