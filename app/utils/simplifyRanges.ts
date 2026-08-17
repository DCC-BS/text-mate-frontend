import type { Node as PmNode } from "@tiptap/pm/model";
import type { DiffHunk } from "~/types/diff";
import {
    advisorSegments,
    clampOffset,
    splitByParagraph,
} from "~/utils/advisorText";

/** A half-open plain-text range `[start, end)`, detached from any id. */
export type OffsetRange = { start: number; end: number };

/** Reason why a passage is flagged after Diff Review. */
export type SimplifyRangeKind = "rewritten" | "rejected";

/**
 * A passage the simplification loop could not bring into the target band.
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
 * offsets to ProseMirror positions.
 */
export function buildSimplifyDecorationSpecs(
    doc: PmNode,
    ranges: SimplifyRange[],
    activeId: string | undefined,
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

/** An {@link OffsetRange} remapped onto Diff Review's resolved text. */
export type MappedUnconvergedRange = OffsetRange & { kind: SimplifyRangeKind };

/**
 * Remaps ranges expressed in corrected-text space onto resolved text based on hunk decisions.
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
