<script lang="ts" setup>
import { computed } from "vue";
import CefrScoreVisualization from "~/components/CefrScoreVisualization.vue";
import FleschScoreVisualization from "~/components/FleschScoreVisualization.vue";
import { useCefrScore } from "~/composables/useCefrScore";
import { useTextStats } from "~/composables/useTextStats";

const { t } = useI18n();

const props = defineProps<{
    text: string;
}>();

const textRef = computed(() => props.text);

// Existing client-side statistics
const {
    charCount,
    wordCount,
    syllableCount,
    averageSentenceLength,
    averageSyllablesPerWord,
    fleschScore,
} = useTextStats(textRef);

// Consume custom composable for the backend readability evaluation. Only de/en
// come back with a CEFR level; fr/it carry their own metric instead (§10).
const { isLoading, cefrLevel, language, score, scoreLabel, band, error } =
    useCefrScore(textRef);
</script>

<template>
    <div class="flex flex-col gap-2">
        <!-- Fancy Flesch Score Visualization -->
        <div class="bg-white border border-gray-200 p-2 rounded-md">
            <div class="grid grid-cols-2">
                <span>{{ t("text-stats.character-count") }}</span>
                <span class="text-end font-bold" data-testid="characterCount"
                    >{{ charCount }}</span
                >

                <span>{{ t("text-stats.word-count") }}:</span>
                <span class="text-end font-bold" data-testid="wordCount"
                    >{{ wordCount }}</span
                >

                <span>{{ t("text-stats.syllable-count") }}</span>
                <span class="text-end font-bold" data-testid="syllableCount"
                    >{{ syllableCount }}</span
                >

                <span>{{ t("text-stats.average-sentence-length") }}</span>
                <span
                    class="text-end font-bold"
                    data-testid="averageSentenceLength"
                    >{{ averageSentenceLength }}</span
                >

                <span>{{ t("text-stats.average-syllables-per-word") }}</span>
                <span
                    class="text-end font-bold"
                    data-testid="averageSyllablesPerWord"
                    >{{ averageSyllablesPerWord }}</span
                >
            </div>
            <!-- Disable FleschScore in favor for CEFR score -->
            <!-- <FleschScoreVisualization :score="fleschScore" /> -->

            <!-- Text Understandability Score Visualization -->
            <CefrScoreVisualization
                :is-loading="isLoading"
                :cefr-level="cefrLevel"
                :language="language"
                :score="score"
                :score-label="scoreLabel"
                :band="band"
                :error="error"
            />
        </div>
    </div>
</template>
