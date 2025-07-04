<script lang="ts" setup>
interface FleschScoreLevel {
    min: number;
    max: number;
    label: string;
    color: string;
    bgColor: string;
}

const props = defineProps<{
    score: number;
}>();

const { t } = useI18n();

// Define the Flesch score levels with colors (simplified to 4 categories)
const fleschLevels: FleschScoreLevel[] = [
    {
        min: 70,
        max: 101,
        label: t("flesch-score.easy"),
        color: "#10B981",
        bgColor: "#ECFDF5",
    },
    {
        min: 50,
        max: 70,
        label: t("flesch-score.standard"),
        color: "#F59E0B",
        bgColor: "#FFFBEB",
    },
    {
        min: 30,
        max: 50,
        label: t("flesch-score.difficult"),
        color: "#EF4444",
        bgColor: "#FEF2F2",
    },
    {
        min: 0,
        max: 30,
        label: t("flesch-score.academic"),
        color: "#8B5CF6",
        bgColor: "#F3E8FF",
    },
];

// Find the current score level
const currentLevel = computed(() => {
    return (
        fleschLevels.find(
            (level) => props.score >= level.min && props.score < level.max,
        ) || fleschLevels[fleschLevels.length - 1]
    );
});

// Calculate the position on the scale (0-100%)
const scorePosition = computed(() => {
    const clampedScore = Math.max(0, Math.min(100, props.score));
    return `${clampedScore}%`;
});

// Calculate the width of each segment
const segmentWidth = computed(() => {
    return `${100 / fleschLevels.length}%`;
});
</script>

<template>
  <div class="flesch-score-container">
    <!-- Header with score -->
    <div class="flesch-header">
      <h3 class="flesch-title">{{ t('flesch-score.reading-ease') }}</h3>
      <div class="flesch-score-badge" :style="{ backgroundColor: currentLevel.bgColor, color: currentLevel.color }">
        {{ Math.round(score) }}
      </div>
    </div>

    <!-- Simple progress bar -->
    <div class="flesch-progress-bar">
      <div class="progress-track">
        <div 
          class="progress-fill"
          :style="{ 
            width: scorePosition,
            backgroundColor: currentLevel.color
          }"
        ></div>
      </div>
      <div class="progress-labels">
        <span class="label-start">0</span>
        <span class="label-end">100</span>
      </div>
    </div>

    <!-- Current level display -->
    <div class="current-level" :style="{ backgroundColor: currentLevel.bgColor, color: currentLevel.color }">
      {{ currentLevel.label }}
    </div>
  </div>
</template>

<style scoped>
.flesch-score-container {
  background-color: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.flesch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.flesch-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.flesch-score-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 700;
  font-size: 1rem;
}

.flesch-progress-bar {
  margin-bottom: 16px;
}

.progress-track {
  height: 8px;
  background-color: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 0.75rem;
  color: #6b7280;
}

.current-level {
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .flesch-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .flesch-score-badge {
    align-self: flex-end;
  }
}
</style>
