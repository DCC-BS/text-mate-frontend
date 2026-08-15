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

const showCefr = computed<boolean>(() => showsCefrLevel(props.value));

const showScore = computed<boolean>(() => showsRawScore(props.value));

const showNothing = computed<boolean>(() => isUnscored(props.value));

const cefrLabel = computed<string>(() => {
    const cefr = props.value.cefr;
    if (cefr === undefined) {
        return "";
    }
    return t(`flesch-score.cefr-level-${cefr.toLowerCase()}`);
});

const bandLabel = computed<string>(() => {
    const band = props.value.band;
    return band === undefined ? "" : t(bandLabelKey(band));
});

const scoreText = computed<string>(() => {
    const score = props.value.score;
    if (score === undefined) {
        return "";
    }
    const label = props.value.scoreLabel;
    const formatted = formatScore(score);
    return label === undefined ? formatted : `${label} ${formatted}`;
});

const valueClass = computed<string>(() =>
    props.compact ? "text-sm font-bold" : "text-base font-black",
);

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
