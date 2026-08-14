import { v7 } from "uuid";
import { computed, ref } from "vue";
import type {
    OffsetRange,
    SimplifyRange,
    SimplifyRangeKind,
} from "~/utils/simplifyRanges";

// Module-level singleton state, matching `useSimplify`/`useWorkspace`: one
// simplification runs at a time per session, and the editor's decoration
// plugin, the nav bar and the workspace all read/write the same ranges.
const ranges = ref<SimplifyRange[]>([]);
const activeRangeId = ref<string | null>(null);

/**
 * Owns the set of unconverged-passage ranges (T6.7) shown as inline
 * highlights in the editor, and which one is currently active for the
 * count+navigation bar (the "spellcheck pattern" — see
 * `SimplifyRangeNav.vue`). A thin sibling of `useAdvisorRevision`, scoped to
 * this one concern: no notes, no fix status, just ranges that reflow with
 * the text and disappear once their text is edited or superseded.
 */
export function useSimplifyRanges() {
    /** Ranges in document order — the order the nav bar counts through. */
    const orderedRanges = computed<SimplifyRange[]>(() =>
        ranges.value.toSorted((a, b) => a.range.start - b.range.start),
    );

    const activeIndex = computed<number>(() =>
        orderedRanges.value.findIndex((r) => r.id === activeRangeId.value),
    );

    /**
     * Replaces the whole set, e.g. after a simplify diff is committed. Each
     * raw `{start, end}` (already in the committed text's offset space) gets
     * a fresh id; the first range becomes active so the nav bar has
     * somewhere to point. `kind` defaults to `"rewritten"` — every caller
     * that doesn't track hunk decisions (e.g. a no-op Diff Review dismiss,
     * where nothing was rejected because there were no hunks at all) is
     * exactly that case; only `DiffViewer.mapUnconvergedRanges` produces the
     * `"rejected"` kind, from its own hunk bookkeeping.
     */
    function setRanges(
        raw: readonly (OffsetRange & { kind?: SimplifyRangeKind })[],
    ): void {
        ranges.value = raw.map((r) => ({
            id: v7(),
            range: { start: r.start, end: r.end },
            kind: r.kind ?? "rewritten",
        }));
        activeRangeId.value = ranges.value[0]?.id ?? null;
    }

    /** Drops every range, e.g. once another operation rewrites the text. */
    function clear(): void {
        ranges.value = [];
        activeRangeId.value = null;
    }

    /** Auto-dismiss: drops the ranges whose text collapsed on an edit. */
    function dismiss(ids: readonly string[]): void {
        const idSet = new Set(ids);
        ranges.value = ranges.value.filter((r) => !idSet.has(r.id));
        if (activeRangeId.value !== null && idSet.has(activeRangeId.value)) {
            activeRangeId.value = orderedRanges.value[0]?.id ?? null;
        }
    }

    function selectRange(id: string): void {
        activeRangeId.value = id;
    }

    /** Advances to the next range in document order, wrapping around. */
    function next(): void {
        const list = orderedRanges.value;
        if (list.length === 0) {
            return;
        }
        const nextIndex =
            activeIndex.value === -1
                ? 0
                : (activeIndex.value + 1) % list.length;
        activeRangeId.value = list[nextIndex]?.id ?? null;
    }

    /** Moves to the previous range in document order, wrapping around. */
    function prev(): void {
        const list = orderedRanges.value;
        if (list.length === 0) {
            return;
        }
        const prevIndex =
            activeIndex.value === -1
                ? list.length - 1
                : (activeIndex.value - 1 + list.length) % list.length;
        activeRangeId.value = list[prevIndex]?.id ?? null;
    }

    return {
        // Deliberately not wrapped in `readonly()`: the decoration plugin's
        // reflow (`reflowAdvisorRanges`) mutates each range's `.range` in
        // place as the document changes, exactly like `AdvisorThread.range`
        // does for `useAdvisorRevision`'s (also unwrapped) `threads`.
        ranges,
        orderedRanges,
        activeRangeId,
        activeIndex,
        setRanges,
        clear,
        dismiss,
        selectRange,
        next,
        prev,
    };
}
