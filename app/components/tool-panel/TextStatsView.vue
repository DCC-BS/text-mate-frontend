<script setup lang="ts">
import CefrScoreVisualization from "~/components/CefrScoreVisualization.vue";
import { useCefrScore } from "~/composables/useCefrScore";
import { useTextStats } from "~/composables/useTextStats";
import { formatNumber } from "~/utils/formatNumber";

const { t } = useI18n();

const props = defineProps<{
    text: string;
}>();

const textRef = computed(() => props.text);

const {
    charCount,
    wordCount,
    syllableCount,
    averageSentenceLength,
    averageSyllablesPerWord,
} = useTextStats(textRef);

const { isLoading, cefrLevel, language, score, scoreLabel, band, error } =
    useCefrScore(textRef);
</script>

<template>
    <div class="flex flex-col gap-2">
        <div class="bg-elevated border border-default p-2 rounded-md">
            <div class="grid grid-cols-2">
                <span>{{ t("text-stats.character-count") }}</span>
                <span class="text-end font-bold" data-testid="characterCount"
                    >{{ formatNumber(charCount) }}</span
                >

                <span>{{ t("text-stats.word-count") }}</span>
                <span class="text-end font-bold" data-testid="wordCount"
                    >{{ formatNumber(wordCount) }}</span
                >

                <span>{{ t("text-stats.syllable-count") }}</span>
                <span class="text-end font-bold" data-testid="syllableCount"
                    >{{ formatNumber(syllableCount) }}</span
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
