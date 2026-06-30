<script lang="ts" setup>
import type { DiffHunk } from "~/types/diff";
import GenericDiffViewer from "../diff/DiffViewer.vue";

interface Props {
    /** Document text before the revision (diff baseline). */
    originalText: string;
    /** Fully-corrected text produced by the revision. */
    correctedText: string;
    /** Optional header title; falls back to `advisor.diffTitle`. */
    title?: string;
}

defineProps<Props>();

const emit = defineEmits<{
    /** Emitted with the final text once the user accepts/discards the diff. */
    apply: [resolvedText: string];
}>();

const diffViewerRef = ref<InstanceType<typeof GenericDiffViewer> | null>(null);

/**
 * "Preview then apply" model: per-hunk toggles only update the core's internal
 * accept/reject state (no editor mutation), keeping the read-only editor stable
 * during review. Committing happens once via the bulk buttons, which hand back
 * the resolved text assembled from the current decisions.
 */
function commit(): void {
    const resolved = diffViewerRef.value?.getResolvedText();
    if (resolved !== undefined) {
        emit("apply", resolved);
    }
}

// Per-hunk events are intentional no-ops: the core tracks status visually and
// getResolvedText() reads it back on commit.
function onAcceptHunk(_hunk: DiffHunk): void {
    // intentionally empty
}

function onRejectHunk(_hunk: DiffHunk): void {
    // intentionally empty
}
</script>

<template>
    <GenericDiffViewer
        ref="diffViewerRef"
        :original-text="originalText"
        :corrected-text="correctedText"
        i18n-prefix="advisor"
        :title="title ?? $t('advisor.diffTitle')"
        @accept-hunk="onAcceptHunk"
        @reject-hunk="onRejectHunk"
        @accept-all="commit"
        @reject-all="commit"
    />
</template>
