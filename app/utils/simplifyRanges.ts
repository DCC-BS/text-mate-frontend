import type { Node as PmNode } from "@tiptap/pm/model";
import type { DiffHunk } from "~/types/diff";
import {
    advisorSegments,
    clampOffset,
    splitByParagraph,
} from "~/utils/advisorText";

/** A half-open plain-text range `[start, end)`, detached from any id. */
export type OffsetRange = { start: number; end: number };

/**
 * Why a passage is still marked after Diff Review settles:
 * - `"rewritten"`: the rewrite was applied (accepted, or never touched by a
 *   hunk at all) and the assembled text still fell short of the target band.
 *   This is what "unconverged" always meant before rejection-awareness.
 * - `"rejected"`: the user rejected the hunk covering this passage, so their
 *   *original* wording ends up in the document instead. We never scored that
 *   original wording — we only know the rewrite was needed and the user
 *   declined it — so the message for this kind must say exactly that, not
 *   claim a measurement that never happened.
 */
export type SimplifyRangeKind = "rewritten" | "rejected";

/**
 * A passage the simplification loop could not bring into the target band
 * within its attempt budget (T6.7), anchored to a half-open plain-text
 * range. Mirrors `AdvisorThread`'s `{ id, range }` shape closely enough that
 * `reflowAdvisorRanges` (in `advisorText.ts`) reflows both through the same
 * generic engine — there is deliberately no second reflow implementation.
 *
 * Unlike `AdvisorThread` there is no `status`: every unconverged passage is
 * navigated identically, and its color (info vs. amber) is a document-level
 * property (whether the assembled text reached the target band), not a
 * per-range one — see `simplifyDecorations.ts`. `kind` exists only to pick
 * the right explanatory message in `SimplifyRangeNav`; it never affects
 * severity/color.
 */
export type SimplifyRange = {
    id: string;
    range: OffsetRange;
    kind: SimplifyRangeKind;
};

export type SimplifyDecorationSpec = {
    id: string;
    from: number;
    to: number;
    active: boolean;
};

/**
 * Builds inline decoration specs for the given ranges, mapping plain-text
 * offsets to ProseMirror positions. Ranges are clamped so a decoration never
 * crosses a paragraph boundary (ProseMirror forbids that); a range spanning
 * multiple paragraphs contributes one decoration per touched paragraph.
 *
 * Reuses the same segment/offset primitives `buildDecorationSpecs` (advisor
 * threads) is built on. No overlap-marker handling here: unlike advisor
 * threads, unconverged passages are backend-reported paragraph spans and are
 * not expected to overlap each other.
 */
export function buildSimplifyDecorationSpecs(
    doc: PmNode,
    ranges: SimplifyRange[],
    activeId: string | null,
): SimplifyDecorationSpec[] {
    const segments = advisorSegments(doc);
    const specs: SimplifyDecorationSpec[] = [];

    for (const item of ranges) {
        const from = clampOffset(segments, item.range.start);
        const to = clampOffset(segments, item.range.end);
        if (from === null || to === null) {
            continue;
        }

        for (const piece of splitByParagraph(segments, from, to)) {
            if (piece.to <= piece.from) {
                continue;
            }
            specs.push({
                id: item.id,
                from: piece.from,
                to: piece.to,
                active: item.id === activeId,
            });
        }
    }

    return specs;
}

/** An {@link OffsetRange} remapped onto Diff Review's resolved text, tagged
 * with why it is still marked — see {@link SimplifyRangeKind}. */
export type MappedUnconvergedRange = OffsetRange & { kind: SimplifyRangeKind };

/**
 * Remaps ranges expressed in the corrected-text offset space (e.g. the
 * simplification loop's `unconverged_ranges`, which are offsets into
 * `done.text`) onto the text Diff Review's `getResolvedText()` would
 * currently produce from `hunks`' accept/reject decisions.
 *
 * Every hunk's `from`/`to` already live in the corrected-text space (see
 * `diffSegments.ts`), so each endpoint of a range is mapped independently by
 * walking the hunks in order:
 * - Ahead of/behind every overlapping hunk, a position just shifts by the
 *   cumulative length delta rejected hunks before it introduce (their
 *   resolved length is `removedText.length`, not `addedText.length`).
 * - Falling inside an accepted/pending hunk, a position maps 1:1 — that
 *   hunk's `addedText` is exactly what the corrected text already has there.
 * - Falling inside a *rejected* hunk, a position snaps to that hunk's full
 *   resolved span instead of interpolating into content that no longer
 *   exists: the hunk's `removedText` is what ends up in the document, so the
 *   common case (a marked passage rewritten as a single hunk) ends up with
 *   the mark covering that restored original wording exactly, rather than
 *   the mark being dropped as it was before rejection-awareness.
 *
 * A range is tagged `kind: "rejected"` when any hunk it overlaps was
 * rejected, `"rewritten"` otherwise — see {@link SimplifyRangeKind}. Ranges
 * that collapse to empty after remapping (defensively, mirroring
 * `UnconvergedRangeSchema`'s own filter) are dropped.
 */
export function remapUnconvergedRanges(
    ranges: readonly OffsetRange[],
    hunks: readonly DiffHunk[],
): MappedUnconvergedRange[] {
    const mapped: MappedUnconvergedRange[] = [];

    for (const range of ranges) {
        const start = mapEndpoint(range.start, hunks, "start");
        const end = mapEndpoint(range.end, hunks, "end");
        if (end <= start) {
            continue;
        }
        const kind: SimplifyRangeKind = hunks.some(
            (h) =>
                h.status === "rejected" &&
                h.from < range.end &&
                h.to > range.start,
        )
            ? "rejected"
            : "rewritten";
        mapped.push({ start, end, kind });
    }

    return mapped;
}

/**
 * Maps a single corrected-text offset onto the resolved text produced by
 * `hunks`' accept/reject decisions. `edge` decides which way a position
 * strictly inside a rejected hunk snaps — see {@link remapUnconvergedRanges}.
 */
function mapEndpoint(
    pos: number,
    hunks: readonly DiffHunk[],
    edge: "start" | "end",
): number {
    let shift = 0;

    for (const hunk of hunks) {
        if (hunk.to <= pos) {
            // Hunk lies entirely before `pos`: only a rejection changes the
            // resolved length here (removedText replaces addedText), which
            // shifts everything after it.
            if (hunk.status === "rejected") {
                shift += hunk.removedText.length - hunk.addedText.length;
            }
            continue;
        }
        if (hunk.from >= pos) {
            // Hunks are in ascending `from` order — `pos` sits at or before
            // this hunk's start, so nothing further applies.
            break;
        }
        // `pos` falls strictly inside this hunk's corrected-text span.
        if (hunk.status === "rejected") {
            return edge === "start"
                ? hunk.from + shift
                : hunk.from + shift + hunk.removedText.length;
        }
        return pos + shift;
    }

    return pos + shift;
}
