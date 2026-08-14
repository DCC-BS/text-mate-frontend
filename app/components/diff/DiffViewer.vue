<script lang="ts" setup>
import type { DiffHunk, HunkStatus } from "~/types/diff";
import { buildDiffSegments, type DiffSegment } from "~/utils/diffSegments";
import {
    type MappedUnconvergedRange,
    type OffsetRange,
    remapUnconvergedRanges,
} from "~/utils/simplifyRanges";

interface DiffViewerProps {
    /** Original (before) text. */
    originalText: string;
    /** Corrected (after) text. */
    correctedText: string;
    /**
     * i18n key prefix used to resolve the title, progress line and bulk button
     * labels, e.g. `"rewrite-diff-viewer"`. The keys `<prefix>.title`,
     * `<prefix>.progress`, `<prefix>.acceptAll`, `<prefix>.discardAll` and
     * `<prefix>.noChanges` are consulted.
     */
    i18nPrefix: string;
    /** Optional explicit header title; falls back to `<prefix>.title`. */
    title?: string;
    /**
     * True while the corrected text is still streaming in. Disables the bulk
     * accept/reject buttons so the diff cannot be finalized until the stream
     * completes.
     */
    streaming?: boolean;
    /**
     * Label shown next to the streaming spinner (e.g. "Rewriting your text…").
     * Resolved by the parent so it reflects whether a Transform or Validation
     * produced the diff.
     */
    streamingLabel?: string;
    /**
     * Replaces the reassuring `<prefix>.noChanges` message when the parent
     * knows the text came back unchanged because the operation *failed*, not
     * because it found nothing to do. The two produce a byte-identical diff, so
     * only the parent can tell them apart — and telling the user "nothing to
     * change" after a run that never reached the model is simply wrong.
     */
    noChangeNotice?: string;
}

const props = defineProps<DiffViewerProps>();
const { t } = useI18n();

const emit = defineEmits<{
    "accept-hunk": [hunk: DiffHunk];
    "reject-hunk": [hunk: DiffHunk];
    "accept-all": [hunks: DiffHunk[]];
    "reject-all": [hunks: DiffHunk[]];
    /**
     * Fired by the "Back to text" button when the diff has no reviewable
     * hunks — either a no-op result (corrected === original) or an empty
     * response (corrected === ""). The parent leaves Diff Review without
     * altering the Working Text. See ADR 0003.
     */
    dismiss: [];
}>();

/**
 * Per-hunk status keyed by the hunk's text key. Survives reactive rebuilds of
 * the segment list (e.g. when the corrected text mutates after a live revert),
 * so decisions are not lost while unresolved hunks are still on screen.
 */
const statusMap = ref<Record<string, HunkStatus>>({});

/**
 * Current Diff View Mode: "inline" (default, single flowing column) or
 * "split" (original-left / corrected-right two-column layout). Presentational
 * only — toggling reuses the same segment list and statusMap, so per-hunk
 * decisions survive a switch.
 */
const viewMode = ref<"inline" | "split">("inline");

const segments = computed<DiffSegment[]>(() => {
    const built = buildDiffSegments(props.originalText, props.correctedText);
    const statuses = statusMap.value;
    return built.map((segment) =>
        segment.kind === "change"
            ? {
                  kind: "change" as const,
                  hunk: {
                      ...segment.hunk,
                      status: statuses[segment.hunk.key] ?? "pending",
                  },
              }
            : segment,
    );
});

const changeHunks = computed(() =>
    segments.value
        .filter(
            (segment): segment is { kind: "change"; hunk: DiffHunk } =>
                segment.kind === "change",
        )
        .map((segment) => segment.hunk),
);

const pendingHunks = computed(() =>
    changeHunks.value.filter((hunk) => hunk.status === "pending"),
);

/**
 * True when the stream finished but produced no corrected text at all — the
 * model returned an empty response, which we treat as an error and surface
 * with a distinct "something went wrong" hint. Gated on !streaming so the
 * state only resolves once, at stream end. See ADR 0003.
 */
const isErrorState = computed(
    () =>
        !props.streaming &&
        props.originalText !== "" &&
        props.correctedText === "",
);

/**
 * True when the stream finished and the corrected text equals the original
 * (no change hunks). Shown with a positive "nothing to change" hint. The
 * !streaming guard keeps this from flashing before the first chunk arrives.
 * See ADR 0003.
 */
const isNoChangeState = computed(
    () =>
        !props.streaming &&
        changeHunks.value.length === 0 &&
        !isErrorState.value,
);

/** True for either no-result state (no-op or error): both render the
 * "Back to text" exit button in the header. */
const isNoResultState = computed(
    () => isErrorState.value || isNoChangeState.value,
);

const acceptedCount = computed(
    () => Object.values(statusMap.value).filter((s) => s === "accepted").length,
);

const rejectedCount = computed(
    () => Object.values(statusMap.value).filter((s) => s === "rejected").length,
);

const totalCount = computed(
    () => acceptedCount.value + rejectedCount.value + pendingHunks.value.length,
);

const headerTitle = computed(
    () => props.title ?? t(`${props.i18nPrefix}.title`),
);

const progressText = computed(() =>
    t(`${props.i18nPrefix}.progress`, {
        accepted: acceptedCount.value,
        total: totalCount.value,
    }),
);

function setStatus(key: string, status: HunkStatus): void {
    statusMap.value = { ...statusMap.value, [key]: status };
}

function setInlineView(): void {
    viewMode.value = "inline";
}

function setSplitView(): void {
    viewMode.value = "split";
}

function acceptHunk(hunk: DiffHunk): void {
    setStatus(hunk.key, "accepted");
    emit("accept-hunk", { ...hunk, status: "accepted" });
}

function rejectHunk(hunk: DiffHunk): void {
    setStatus(hunk.key, "rejected");
    emit("reject-hunk", { ...hunk, status: "rejected" });
}

function acceptAll(): void {
    const pending = pendingHunks.value;
    const next = { ...statusMap.value };
    for (const hunk of pending) {
        next[hunk.key] = "accepted";
    }
    statusMap.value = next;
    emit("accept-all", pending);
}

function rejectAll(): void {
    const pending = pendingHunks.value;
    const next = { ...statusMap.value };
    for (const hunk of pending) {
        next[hunk.key] = "rejected";
    }
    statusMap.value = next;
    emit("reject-all", pending);
}

/**
 * Leaves Diff Review when there are no hunks to review (no-op or empty
 * response). The parent resets to the editable state without touching the
 * Working Text. See ADR 0003.
 */
function dismiss(): void {
    emit("dismiss");
}

/**
 * Exposes every change hunk currently present in the corrected text, including
 * already-decided ones. Callers (e.g. the rewrite wrapper) use this to perform
 * a full revert of all changes back to the original text.
 */
function getAllChangeHunks(): DiffHunk[] {
    return changeHunks.value;
}

/**
 * Reconstructs the full text from the current per-hunk decisions: rejected
 * hunks contribute their original text, every other hunk (pending/accepted)
 * contributes the corrected text, and unchanged segments flow through. Used by
 * "preview then apply" callers (e.g. the advisor wrapper) to commit the final
 * text in a single update.
 */
function getResolvedText(): string {
    let result = "";
    for (const segment of segments.value) {
        if (segment.kind === "text") {
            result += segment.value;
        } else {
            const hunk = segment.hunk;
            result +=
                hunk.status === "rejected" ? hunk.removedText : hunk.addedText;
        }
    }
    return result;
}

function areAllHunksResolved(): boolean {
    return segments.value
        .filter((x) => x.kind === "change")
        .every((x) => x.hunk.status !== "pending");
}

function hasPendingHunks(): boolean {
    return pendingHunks.value.length > 0;
}

/**
 * Remaps ranges expressed in the corrected-text offset space (e.g. the
 * simplification loop's `unconverged_ranges`, which are offsets into
 * `done.text` === `correctedText`) onto the resolved text this viewer would
 * currently produce via {@link getResolvedText}, tagging each with why it is
 * still marked (`kind`, see {@link MappedUnconvergedRange}). A range
 * overlapping a rejected hunk is no longer dropped — the user's own wording
 * restored by the rejection is almost certainly *harder* than the rewrite
 * they turned down, so the mark now follows it onto that restored text
 * instead of silently disappearing. Delegates the actual offset arithmetic
 * to `remapUnconvergedRanges` (framework-agnostic, unit-tested on its own).
 */
function mapUnconvergedRanges(
    ranges: readonly OffsetRange[],
): MappedUnconvergedRange[] {
    return remapUnconvergedRanges(ranges, changeHunks.value);
}

defineExpose({
    getAllChangeHunks,
    getResolvedText,
    areAllHunksResolved,
    hasPendingHunks,
    mapUnconvergedRanges,
});
</script>

<template>
    <div class="h-full flex flex-col">
        <header
            class="flex items-center justify-between gap-3 mb-4 pb-3.5 border-b border-default shrink-0"
        >
            <div class="min-w-0">
                <div class="text-base font-bold text-highlighted truncate">
                    {{ headerTitle }}
                </div>
                <div
                    v-if="changeHunks.length"
                    class="text-xs text-muted mt-0.5"
                >
                    {{ progressText }}
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <slot name="actions" />
                <template v-if="changeHunks.length">
                    <UButton
                        icon="i-lucide-align-left"
                        color="neutral"
                        size="xs"
                        :variant="viewMode === 'inline' ? 'solid' : 'outline'"
                        :title="t('common.diffViewInline')"
                        :aria-label="t('common.diffViewInline')"
                        @click="setInlineView"
                    />
                    <UButton
                        icon="i-lucide-columns-2"
                        color="neutral"
                        size="xs"
                        :variant="viewMode === 'split' ? 'solid' : 'outline'"
                        :title="t('common.diffViewSplit')"
                        :aria-label="t('common.diffViewSplit')"
                        data-tour="diff-split-view"
                        @click="setSplitView"
                    />
                    <UButton
                        variant="outline"
                        color="neutral"
                        size="xs"
                        class="rounded-full"
                        data-tour="diff-discard-all"
                        :disabled="streaming"
                        :label="t(`${i18nPrefix}.discardAll`)"
                        @click="rejectAll"
                    />
                    <UButton
                        variant="outline"
                        color="primary"
                        size="xs"
                        class="rounded-full"
                        data-tour="diff-accept-all"
                        :disabled="streaming"
                        :label="t(`${i18nPrefix}.acceptAll`)"
                        @click="acceptAll"
                    />
                </template>
                <UButton
                    v-else-if="isNoResultState"
                    variant="solid"
                    color="primary"
                    size="xs"
                    class="rounded-full"
                    :label="t(`${i18nPrefix}.backToText`)"
                    @click="dismiss"
                />
            </div>
        </header>

        <div
            v-if="streaming"
            class="flex items-center gap-2 shrink-0 px-1 py-1.5 mb-2 text-xs text-muted border-b border-default"
            role="status"
            aria-live="polite"
        >
            <UIcon name="i-lucide-loader" class="animate-spin size-3.5" />
            <span>{{ streamingLabel }}</span>
        </div>

        <div class="flex-1 overflow-auto">
            <template v-if="changeHunks.length">
                <!-- Inline View (default): single flowing column -->
                <p
                    v-if="viewMode === 'inline'"
                    class="m-0 text-base leading-loose whitespace-pre-wrap break-words text-default"
                >
                    <template v-for="(segment, i) in segments" :key="i">
                        <span v-if="segment.kind === 'text'"
                            >{{ segment.value }}</span
                        >

                        <span
                            v-else-if="segment.hunk.status === 'accepted'"
                            class="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 rounded-sm px-[3px]"
                            >{{ segment.hunk.addedText }}</span
                        >

                        <span
                            v-else-if="segment.hunk.status === 'rejected'"
                            class="line-through text-gray-400 dark:text-gray-600"
                            >{{ segment.hunk.removedText }}</span
                        >

                        <span v-else class="inline align-baseline">
                            <span
                                v-if="segment.hunk.removedText"
                                class="line-through text-gray-400 bg-red-50 dark:bg-red-950/40 dark:text-gray-500 rounded-sm px-[2px]"
                                >{{ segment.hunk.removedText }}</span
                            >
                            <span
                                v-if="
                                    segment.hunk.removedText &&
                                    segment.hunk.addedText
                                "
                                class="text-gray-400 dark:text-gray-500 mx-[3px]"
                                >→</span
                            >
                            <span
                                v-if="segment.hunk.addedText"
                                class="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 rounded-sm px-[3px]"
                                >{{ segment.hunk.addedText }}</span
                            >
                            <span
                                class="inline-flex gap-px ml-[5px] align-middle"
                            >
                                <UButton
                                    size="xs"
                                    variant="solid"
                                    color="success"
                                    square
                                    icon="i-lucide-check"
                                    :title="t('common.accept')"
                                    :aria-label="t('common.accept')"
                                    @click="acceptHunk(segment.hunk)"
                                />
                                <UButton
                                    size="xs"
                                    variant="soft"
                                    color="neutral"
                                    square
                                    icon="i-lucide-x"
                                    :title="t('common.reject')"
                                    :aria-label="t('common.reject')"
                                    @click="rejectHunk(segment.hunk)"
                                />
                            </span>
                        </span>
                    </template>
                </p>

                <!--
                    Split View: original text flows in the left column,
                    corrected text flows in the right column (each rendered as
                    one continuous block, not a row per hunk, so prose is not
                    broken at segment boundaries). Reuses the word-level segment
                    engine — see ADR 0002.
                -->
                <div
                    v-else
                    class="grid grid-cols-2 min-w-[640px] text-base leading-loose"
                >
                    <!-- Column headers -->
                    <div
                        class="sticky top-0 z-10 px-3 py-1.5 text-xs font-semibold text-muted bg-white dark:bg-gray-900 border-b border-default"
                    >
                        {{ t("common.diffOriginal") }}
                    </div>
                    <div
                        class="sticky top-0 z-10 px-3 py-1.5 text-xs font-semibold text-muted bg-white dark:bg-gray-900 border-b border-l border-default"
                    >
                        {{ t("common.diffCorrected") }}
                    </div>

                    <!-- Left column: original / removed text (flows) -->
                    <div
                        class="px-3 py-1 whitespace-pre-wrap break-words text-default"
                    >
                        <template v-for="(segment, i) in segments" :key="i">
                            <template v-if="segment.kind === 'text'"
                                >{{ segment.value }}</template
                            >
                            <template v-else>
                                <span
                                    v-if="segment.hunk.removedText"
                                    :class="
                                        segment.hunk.status === 'pending'
                                            ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 rounded-sm px-[3px]'
                                            : segment.hunk.status === 'accepted'
                                              ? 'line-through text-gray-400 dark:text-gray-600'
                                              : 'bg-gray-100 dark:bg-gray-800 text-default rounded-sm px-[3px]'
                                    "
                                    >{{ segment.hunk.removedText }}</span
                                >
                                <UButton
                                    v-if="segment.hunk.status === 'pending'"
                                    size="xs"
                                    variant="soft"
                                    color="neutral"
                                    square
                                    icon="i-lucide-x"
                                    class="ml-1 align-middle"
                                    :title="t('common.reject')"
                                    :aria-label="t('common.reject')"
                                    @click="rejectHunk(segment.hunk)"
                                />
                                <!-- Pure deletion: no added text on the right,
                                     so accept must also be reachable here. -->
                                <UButton
                                    v-if="
                                        segment.hunk.status === 'pending' &&
                                        !segment.hunk.addedText
                                    "
                                    size="xs"
                                    variant="solid"
                                    color="success"
                                    square
                                    icon="i-lucide-check"
                                    class="ml-px align-middle"
                                    :title="t('common.accept')"
                                    :aria-label="t('common.accept')"
                                    @click="acceptHunk(segment.hunk)"
                                />
                            </template>
                        </template>
                    </div>

                    <!-- Right column: corrected / added text (flows) -->
                    <div
                        class="px-3 py-1 whitespace-pre-wrap break-words text-default border-l border-default"
                    >
                        <template v-for="(segment, i) in segments" :key="i">
                            <template v-if="segment.kind === 'text'"
                                >{{ segment.value }}</template
                            >
                            <template v-else>
                                <span
                                    v-if="segment.hunk.addedText"
                                    :class="
                                        segment.hunk.status === 'rejected'
                                            ? 'line-through text-gray-400 dark:text-gray-600'
                                            : 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 rounded-sm px-[3px]'
                                    "
                                    >{{ segment.hunk.addedText }}</span
                                >
                                <UButton
                                    v-if="segment.hunk.status === 'pending'"
                                    size="xs"
                                    variant="solid"
                                    color="success"
                                    square
                                    icon="i-lucide-check"
                                    class="ml-1 align-middle"
                                    :title="t('common.accept')"
                                    :aria-label="t('common.accept')"
                                    @click="acceptHunk(segment.hunk)"
                                />
                                <!-- Pure insertion: no removed text on the
                                     left, so reject must also be reachable
                                     here. -->
                                <UButton
                                    v-if="
                                        segment.hunk.status === 'pending' &&
                                        !segment.hunk.removedText
                                    "
                                    size="xs"
                                    variant="soft"
                                    color="neutral"
                                    square
                                    icon="i-lucide-x"
                                    class="ml-px align-middle"
                                    :title="t('common.reject')"
                                    :aria-label="t('common.reject')"
                                    @click="rejectHunk(segment.hunk)"
                                />
                            </template>
                        </template>
                    </div>
                </div>
            </template>
            <!-- Empty stream: the model returned nothing — treat as error. -->
            <div
                v-else-if="isErrorState"
                class="flex flex-col items-center justify-center gap-3 py-16 text-center"
                data-tour="diff-empty-error"
            >
                <UIcon
                    name="i-lucide-circle-alert"
                    class="size-8 text-amber-500"
                />
                <p class="m-0 text-sm text-default font-medium">
                    {{ t(`${i18nPrefix}.emptyResponse`) }}
                </p>
            </div>
            <!-- No-op result: corrected text matched the original. Either
                 nothing needed changing, or the parent knows the run failed
                 and passed a notice saying so. -->
            <div
                v-else-if="isNoChangeState"
                class="flex flex-col items-center justify-center gap-3 py-16 text-center"
                data-tour="diff-no-changes"
            >
                <UIcon
                    v-if="props.noChangeNotice"
                    name="i-lucide-circle-alert"
                    class="size-8 text-amber-500"
                />
                <UIcon
                    v-else
                    name="i-lucide-sparkles"
                    class="size-8 text-primary"
                />
                <p
                    class="m-0 text-sm text-default font-medium"
                    data-testid="diffNoChangeMessage"
                >
                    {{ props.noChangeNotice ?? t(`${i18nPrefix}.noChanges`) }}
                </p>
            </div>
        </div>
    </div>
</template>
