<script setup lang="ts">
import {
    bandClass,
    bandLabelKey,
    cefrLevelClass,
    formatScore,
    isUnscored,
    type ReadabilityScore,
    showsCefrLevel,
    showsRawScore,
} from "~/utils/readability";

const props = defineProps<{
    value: ReadabilityScore;
    compact?: boolean;
}>();

const { t } = useI18n();

/** Render CEFR level badge (for DE/EN when CEFR level is available) */
const showCefr = computed<boolean>(() => showsCefrLevel(props.value));

/** Render raw metric score + band badge (e.g., LIX/Gulpease for FR/IT) */
const showScore = computed<boolean>(() => showsRawScore(props.value));

/** True when no score or level is available to render */
const showNothing = computed<boolean>(() => isUnscored(props.value));

/** CEFR level descriptor label (e.g., 'Sehr einfach', 'Schwer') */
const cefrLabel = computed<string>(() => {
    const cefr = props.value.cefr;
    if (cefr === undefined) {
        return "";
    }
    return t(`flesch-score.cefr-level-${cefr.toLowerCase()}`);
});

/** Readability band label (e.g., 'Einfach', 'Mittel', 'Schwer') */
const bandLabel = computed<string>(() => {
    const band = props.value.band;
    return band === undefined ? "" : t(bandLabelKey(band));
});

/** Formatted raw score string, prepended with metric label if present (e.g. 'LIX 45.8') */
const scoreText = computed<string>(() => {
    const score = props.value.score;
    if (score === undefined) {
        return "";
    }
    const label = props.value.scoreLabel;
    const formatted = formatScore(score);
    return label === undefined ? formatted : `${label} ${formatted}`;
});

/** Typography class for value based on compact mode */
const valueClass = computed<string>(() =>
    props.compact ? "text-sm font-bold" : "text-base font-black",
);

/** Typography class for label based on compact mode */
const labelClass = computed<string>(() =>
    props.compact
        ? "hidden sm:inline text-xs font-bold uppercase tracking-wider"
        : "text-xs font-bold uppercase tracking-wider",
);
</script>

<template>
    <span v-if="showNothing" />

    <span v-else-if="showCefr" class="inline-flex items-center gap-1.5">
        <span :class="[valueClass, 'text-highlighted']">
            {{ props.value.cefr }}
        </span>
        <span :class="[labelClass, cefrLevelClass(props.value.cefr)]">
            {{ cefrLabel }}
        </span>
    </span>

    <span v-else-if="showScore" class="inline-flex items-center gap-1.5">
        <span :class="[valueClass, 'text-highlighted']">
            {{ scoreText }}
        </span>
        <span
            v-if="bandLabel"
            :class="[labelClass, bandClass(props.value.band)]"
        >
            {{ bandLabel }}
        </span>
    </span>
</template>
