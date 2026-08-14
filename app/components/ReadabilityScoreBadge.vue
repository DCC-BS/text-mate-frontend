<script lang="ts" setup>
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

/**
 * Renders one readability score in whichever form the text's language
 * supports (spec §10):
 * - `de` / `en`: the CEFR level plus its localized name;
 * - `fr` / `it`: the metric label and value (`LIX 38`) plus its band;
 * - not scored: nothing at all — no level is ever invented for a language
 *   that has no mapping.
 */
const props = defineProps<{
    value: ReadabilityScore;
    /** Renders the metric name/level in a smaller type scale. */
    compact?: boolean;
}>();

const { t } = useI18n();

const showCefr = computed<boolean>(() => showsCefrLevel(props.value));
const showScore = computed<boolean>(() => showsRawScore(props.value));
const showNothing = computed<boolean>(() => isUnscored(props.value));

/** Localized CEFR level name, e.g. "Einfach" for A2. */
const cefrLabel = computed<string>(() => {
    const cefr = props.value.cefr;
    if (cefr === undefined) {
        return "";
    }
    return t(`flesch-score.cefr-level-${cefr.toLowerCase()}`);
});

/** Localized band name, e.g. "Einfach" for `easy`. */
const bandLabel = computed<string>(() => {
    const band = props.value.band;
    return band === undefined ? "" : t(bandLabelKey(band));
});

/** `LIX 38.0` — the metric label is only meaningful next to its value. */
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

/**
 * The descriptive word ("Nahezu muttersprachlich") is dropped on narrow
 * screens in compact mode: the diff header is a single non-wrapping row, and
 * two spelled-out levels do not fit next to the bulk actions on a phone.
 */
const labelClass = computed<string>(() =>
    props.compact
        ? "hidden sm:inline text-xs font-bold uppercase tracking-wider"
        : "text-xs font-bold uppercase tracking-wider",
);
</script>

<template>
    <!-- Unsupported language: nothing is rendered, not even a placeholder. -->
    <span v-if="showNothing" />

    <span v-else-if="showCefr" class="inline-flex items-center gap-1.5">
        <span :class="[valueClass, 'text-gray-800 dark:text-gray-100']">
            {{ props.value.cefr }}
        </span>
        <span :class="[labelClass, cefrLevelClass(props.value.cefr)]">
            {{ cefrLabel }}
        </span>
    </span>

    <span v-else-if="showScore" class="inline-flex items-center gap-1.5">
        <span :class="[valueClass, 'text-gray-800 dark:text-gray-100']">
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
