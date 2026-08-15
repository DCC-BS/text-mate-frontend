<script setup lang="ts">
import ReadabilityScoreBadge from "~/components/ReadabilityScoreBadge.vue";
import { isUnscored, type ReadabilityScore } from "~/utils/readability";
import type { ReadabilityBand } from "~~/shared/types/simplify";

const { t } = useI18n();

const props = defineProps<{
    isLoading: boolean;
    cefrLevel?: string;
    language?: string;
    score?: number;
    scoreLabel?: string;
    band?: ReadabilityBand;
    error?: string;
}>();

/** Readability score representation passed down to ReadabilityScoreBadge */
const scoreValue = computed<ReadabilityScore>(() => ({
    scored: props.cefrLevel !== undefined || props.score !== undefined,
    language: props.language,
    scoreLabel: props.scoreLabel,
    score: props.score,
    band: props.band,
    cefr: props.cefrLevel,
}));

/** True when the text cannot be scored or is too short / unsupported */
const hasNothingToShow = computed<boolean>(() => isUnscored(scoreValue.value));

/** Dynamic row label based on whether CEFR or a custom readability metric is active */
const rowLabel = computed<string>(() => {
    if (props.cefrLevel === undefined && props.scoreLabel !== undefined) {
        return t("simplify.readability", { label: props.scoreLabel });
    }
    return t("flesch-score.cefr-level");
});

/** Tooltip explanation for the readability metric or CEFR level */
const rowDescription = computed<string>(() =>
    props.cefrLevel === undefined && props.scoreLabel !== undefined
        ? t("simplify.readabilityDescription")
        : t("flesch-score.cefr-description"),
);

/** Empty state message: "Sprache nicht unterstützt" when language detected but unscored, or "Text zu kurz" */
const emptyStateText = computed<string>(() =>
    props.language !== undefined
        ? t("simplify.notSupported")
        : t("flesch-score.cefr-too-short"),
);
</script>

<template>
    <div
        class="mt-4 pt-3 border-t border-default flex items-center justify-between text-sm"
    >
        <UTooltip :text="rowDescription">
            <span
                class="text-xs font-medium text-muted cursor-help hover:text-default"
            >
                {{ rowLabel }}
            </span>
        </UTooltip>

        <div v-if="props.error" class="text-xs text-error font-medium">
            {{ props.error }}
        </div>

        <div v-else-if="props.isLoading" class="py-0.5">
            <USkeleton class="h-4 w-[60px]" />
        </div>

        <div v-else-if="hasNothingToShow" class="text-xs text-muted italic">
            {{ emptyStateText }}
        </div>

        <ReadabilityScoreBadge v-else :value="scoreValue" />
    </div>
</template>
