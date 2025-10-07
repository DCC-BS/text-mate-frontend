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
const fleschLevels: [FleschScoreLevel, ...FleschScoreLevel[]] = [
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
    ) ?? (fleschLevels.at(-1) as FleschScoreLevel)
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
  <!-- <div class="flesch-score-container"> -->
  <!-- Compact header with score and level inline -->
  <div class="flesch-header">
    <span class="flesch-title">{{ t('flesch-score.reading-ease') }}</span>
    <div class="flesch-info">
      <span class="flesch-score">{{ Math.round(score) }}</span>
      <span class="flesch-level" :style="{ color: currentLevel.color }">
        {{ currentLevel.label }}
      </span>
    </div>
  </div>

  <!-- Compact progress bar -->
  <div class="flesch-progress-bar">
    <div class="progress-track">
      <div class="progress-fill" :style="{
        width: scorePosition,
        backgroundColor: currentLevel.color
      }"></div>
    </div>
  </div>
  <!-- </div> -->
</template>

<style scoped>
.flesch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.flesch-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  margin: 0;
}

.flesch-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flesch-score {
  font-weight: 700;
  font-size: 1.125rem;
  color: #1f2937;
}

.flesch-level {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.flesch-progress-bar {
  margin-bottom: 0;
}

.progress-track {
  height: 6px;
  background-color: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 3px;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .flesch-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .flesch-info {
    align-self: flex-end;
  }
}
</style>
