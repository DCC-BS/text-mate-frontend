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
  <div class="flex flex-col gap-2">
    <!-- Fancy Flesch Score Visualization -->
    <div class="bg-white border-1 border-gray-200 p-2 rounded-md">
      <!-- <div v-if="showDetails"> -->
      <div class="grid grid-cols-2">
        <span>{{ t('text-stats.character-count') }}</span>
        <span class="text-end font-bold" data-testid="characterCount">{{ charCount }}</span>

        <span>{{ t('text-stats.word-count') }}:</span>
        <span class="text-end font-bold" data-testid="wordCount">{{ wordCount }}</span>

        <span>{{ t('text-stats.syllable-count') }}</span>
        <span class="text-end font-bold" data-testid="syllableCount">{{ syllableCount }}</span>

        <span>{{ t('text-stats.average-sentence-length') }}</span>
        <span class="text-end font-bold" data-testid="averageSentenceLength">{{ averageSentenceLength }}</span>

        <span>{{ t('text-stats.average-syllables-per-word') }}</span>
        <span class="text-end font-bold" data-testid="averageSyllablesPerWord">{{ averageSyllablesPerWord }}</span>
      </div>
      <FleschScoreVisualization :score="fleschScore" />
    </div>
    <!-- </div> -->
  </div>
</template>
