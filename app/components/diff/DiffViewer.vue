<script lang="ts" setup>
import type { DiffHunk, HunkStatus } from "~/types/diff";
import { buildDiffSegments, type DiffSegment } from "~/utils/diffSegments";

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
}

const props = defineProps<DiffViewerProps>();
const { t } = useI18n();

const emit = defineEmits<{
    "accept-hunk": [hunk: DiffHunk];
    "reject-hunk": [hunk: DiffHunk];
    "accept-all": [hunks: DiffHunk[]];
    "reject-all": [hunks: DiffHunk[]];
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

defineExpose({
    getAllChangeHunks,
    getResolvedText,
    areAllHunksResolved,
    hasPendingHunks,
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
                        @click="setSplitView"
                    />
                    <UButton
                        variant="outline"
                        color="neutral"
                        size="xs"
                        class="rounded-full"
                        :label="t(`${i18nPrefix}.discardAll`)"
                        @click="rejectAll"
                    />
                    <UButton
                        variant="outline"
                        color="primary"
                        size="xs"
                        class="rounded-full"
                        :label="t(`${i18nPrefix}.acceptAll`)"
                        @click="acceptAll"
                    />
                </template>
            </div>
        </header>

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
            <div v-else class="text-center text-muted py-10 text-sm">
                {{ t(`${i18nPrefix}.noChanges`) }}
            </div>
        </div>
    </div>
</template>
