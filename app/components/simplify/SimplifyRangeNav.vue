<script lang="ts" setup>
import type { SimplifyRangeKind } from "~/utils/simplifyRanges";

/**
 * Count + navigation for the passages the simplification loop could not
 * bring into the target band (T6.7), plus the ones where a rewrite *was*
 * proposed for such a passage but the user rejected it — both kinds are
 * counted and stepped through together, since where a passage is matters
 * more than why it is flagged (see `SimplifyRangeKind`). The passages
 * themselves are tinted in place in the editor by `simplifyDecorations.ts`;
 * this bar is the "spellcheck pattern" affordance for them — a count and
 * prev/next controls that scroll to each one, never a list of indices. Per
 * `docs/simplify_redesign.md` §14.4, no per-unit readability number is ever
 * shown here or anywhere else — only the one whole-document score exists on
 * screen.
 */
const props = defineProps<{
    /** Number of passages still flagged. Nothing renders when this is 0. */
    count: number;
    /**
     * Whether the assembled text reached the target band — keyed off the
     * document band, not off whether any unit fell short, so this stays
     * consistent with the readability badge instead of contradicting it.
     * `true` → info (blue): the text is fine overall, these are worth a
     * look. `false` → amber: the document itself did not reach the target.
     * Deliberately the *only* thing that drives color: the two `kind`s are
     * told apart by message, not by a second color.
     */
    converged: boolean;
    /** 0-based position of the active passage among the ordered set, -1 if none. */
    activeIndex: number;
    /**
     * Why the active passage is flagged; `undefined` when none is active.
     * `"rejected"` gets an explanatory line the others don't — see the
     * `reason` computed below.
     */
    activeKind?: SimplifyRangeKind;
}>();

const emit = defineEmits<{
    prev: [];
    next: [];
}>();

const { t } = useI18n();

const title = computed<string>(() =>
    t("simplify.unconverged.title", { count: props.count }, props.count),
);

const position = computed<string | undefined>(() =>
    props.activeIndex >= 0
        ? t("simplify.unconverged.position", {
              index: props.activeIndex + 1,
              count: props.count,
          })
        : undefined,
);

/**
 * Explains *why* the active passage is still marked, but only for the
 * `"rejected"` kind: a rewrite was proposed there and the user turned it
 * down, so their own (unmeasured) wording is what remains — a materially
 * different situation from the `"rewritten"` kind (still above target after
 * the rewrite), which keeps the title/position above as its only message,
 * unchanged from before rejection-awareness existed.
 */
const reason = computed<string | undefined>(() =>
    props.activeKind === "rejected"
        ? t("simplify.unconverged.rejectedReason")
        : undefined,
);

const containerClass = computed<string>(() =>
    props.converged
        ? "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
        : "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
);

const iconName = computed<string>(() =>
    props.converged ? "i-lucide-info" : "i-lucide-triangle-alert",
);

const iconClass = computed<string>(() =>
    props.converged ? "text-blue-500" : "text-amber-500",
);
</script>

<template>
    <div
        v-if="props.count > 0"
        class="flex items-center gap-2.5 px-3 py-2 mb-2 rounded-md border text-xs shrink-0"
        :class="containerClass"
        data-testid="simplifyUnconvergedHint"
    >
        <UIcon :name="iconName" class="size-4 shrink-0" :class="iconClass" />
        <span class="font-medium text-highlighted">{{ title }}</span>
        <span v-if="position" class="text-muted">{{ position }}</span>
        <span v-if="reason" class="text-muted truncate">{{ reason }}</span>
        <div class="ml-auto flex items-center gap-1">
            <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                square
                icon="i-lucide-chevron-up"
                :aria-label="t('simplify.unconverged.prev')"
                :title="t('simplify.unconverged.prev')"
                @click="emit('prev')"
            />
            <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                square
                icon="i-lucide-chevron-down"
                :aria-label="t('simplify.unconverged.next')"
                :title="t('simplify.unconverged.next')"
                @click="emit('next')"
            />
        </div>
    </div>
</template>
