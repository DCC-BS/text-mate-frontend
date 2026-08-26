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

/** Maps language codes to human-readable names with uppercase code */
function formatLanguage(lang?: string): string {
    if (!lang) {
        return "";
    }
    const code = lang.toLowerCase();
    const names: Record<string, string> = {
        de: "Deutsch (DE)",
        en: "English (EN)",
        fr: "Français (FR)",
        it: "Italiano (IT)",
        es: "Español (ES)",
    };
    return names[code] ?? lang.toUpperCase();
}
</script>

<template>
    <div class="flex flex-col gap-2">
        <div class="bg-default border border-default p-2 rounded-md">
            <div class="grid grid-cols-[1fr_auto] gap-x-4 items-center">
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

                <template v-if="language">
                    <span>{{ t("text-stats.language") }}</span>
                    <span
                        class="text-end font-bold"
                        data-testid="detectedLanguage"
                        >{{ formatLanguage(language) }}</span
                    >
                </template>
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
