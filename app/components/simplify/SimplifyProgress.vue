<script lang="ts" setup>
import ReadabilityScoreBadge from "~/components/ReadabilityScoreBadge.vue";
import type { SimplifyProgressState } from "~/composables/useSimplify";
import type { ReadabilityScore } from "~/utils/readability";

/**
 * Progress of the simplification loop. A run measures, rewrites and re-measures
 * the text and can take tens of seconds, so the attempt counter and the
 * units-in-target ratio are the user's only evidence that anything is
 * happening before the diff appears.
 */
const props = defineProps<{
    progress: SimplifyProgressState;
}>();

const { t } = useI18n();

const unitsInTarget = computed<number>(() => props.progress.unitsInTarget);

const unitsTotal = computed<number>(() =>
    Math.max(1, props.progress.unitsTotal),
);

/**
 * What the loop is doing, e.g. "Lesbarkeit wird gemessen…". Readability is the
 * only gate, so the label falls back to it when the event omits `stage`.
 */
const stageLabel = computed<string>(() =>
    t(`simplify.stage.${props.progress.stage ?? "readability"}`),
);

/** The score of the current attempt, in whatever form its language supports. */
const currentScore = computed<ReadabilityScore>(() => ({
    scored: props.progress.scored,
    language: props.progress.language,
    scoreLabel: props.progress.scoreLabel,
    score: props.progress.score,
    band: props.progress.band,
    cefr: props.progress.cefr,
}));
</script>

<template>
    <div
        class="flex flex-col gap-2 px-3 py-2.5 mb-3 rounded-md border border-default bg-gray-50 dark:bg-gray-900"
        role="status"
        aria-live="polite"
        data-testid="simplifyProgress"
    >
        <div class="flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2 min-w-0">
                <UIcon name="i-lucide-loader" class="animate-spin size-3.5" />
                <span class="font-medium text-highlighted">
                    {{ t("simplify.attempt", { attempt: props.progress.attempt }) }}
                </span>
                <span v-if="stageLabel" class="text-muted truncate">
                    {{ stageLabel }}
                </span>
            </div>
            <!-- Nothing is rendered for an unscored language. -->
            <ReadabilityScoreBadge :value="currentScore" compact />
        </div>

        <!-- The count is deliberately NOT in UProgress's `status` slot: that slot's
             container is sized to the percentage, so the label slides left-to-right
             as the bar fills and the number never sits still long enough to read.
             Pinned to the right of its own row instead. -->
        <template v-if="props.progress.unitsTotal > 0">
            <UProgress :model-value="unitsInTarget" :max="unitsTotal" />
            <div class="text-xs text-muted text-right">
                {{ t("simplify.unitsInTarget", {
                        inTarget: unitsInTarget,
                        total: props.progress.unitsTotal,
                    }) }}
            </div>
        </template>
    </div>
</template>
