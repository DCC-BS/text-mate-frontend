import type { Node as PmNode } from "@tiptap/pm/model";
import type { Mapping } from "@tiptap/pm/transform";
import type { AdvisorThread } from "~/assets/models/advisor";

/**
 * A run of text in the document paired with its absolute ProseMirror
 * positions. Segments are emitted in document order, paragraph by
 * paragraph, with a synthetic `"\n\n"` separator between paragraphs (matching
 * Tiptap's `editor.getText()` block separator) and a `"\n"` for hard-break
 * nodes. The concatenation of `.text` is exactly the serialization the
 * advisor validates against, so backend/dummy offsets map 1:1 onto character
 * offsets in this stream. Using `\n\n` for paragraphs keeps the advisor
 * interchange consistent with the rewrite editor, so layout survives
 * switching between the two tools.
 */
export type Segment = {
    text: string;
    from: number;
    to: number;
};

export function advisorSegments(doc: PmNode): Segment[] {
    const segments: Segment[] = [];

    doc.forEach((paragraph, paraOffset, paraIndex) => {
        let pos = paraOffset + 1;
        paragraph.forEach((node) => {
            if (node.isText) {
                const text = node.text ?? "";
                segments.push({ text, from: pos, to: pos + node.nodeSize });
                pos += node.nodeSize;
            } else if (node.type.name === "hardBreak") {
                segments.push({ text: "\n", from: pos, to: pos + 1 });
                pos += 1;
            } else {
                pos += node.nodeSize;
            }
        });

        if (paraIndex < doc.childCount - 1) {
            const sep = paraOffset + paragraph.nodeSize;
            segments.push({ text: "\n\n", from: sep, to: sep });
        }
    });

    return segments;
}

/** Canonical text the advisor validates and diffs against. */
export function serializeAdvisorText(doc: PmNode): string {
    return advisorSegments(doc)
        .map((s) => s.text)
        .join("");
}

/**
 * Converts an inclusive character offset into the segment list to a
 * ProseMirror position. Returns `null` when the offset falls *strictly
 * inside* a synthetic inter-paragraph separator (no real DOM position there).
 *
 * A separator's trailing edge is not really "inside" it — it is the same
 * point as the start of whatever paragraph follows, so an offset landing
 * exactly there resolves to that next segment instead of failing. This
 * matters a lot for paragraph-level ranges (e.g. `unconverged_ranges`):
 * every such range but the first paragraph's starts *exactly* on a paragraph
 * break, so without this the separator's own inclusive boundary test would
 * shadow the real segment and silently drop the whole range.
 */
export function offsetToPos(
    segments: Segment[],
    offset: number,
): { pos: number; segmentIndex: number } | null {
    let cursor = 0;
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (!seg) {
            continue;
        }
        const segLen = seg.text.length;
        const isSeparator = seg.from === seg.to;
        if (isSeparator && offset === cursor + segLen) {
            // Exactly at the separator's trailing edge: fall through to the
            // segment that follows rather than reporting no position.
            cursor += segLen;
            continue;
        }
        if (offset >= cursor && offset <= cursor + segLen) {
            if (isSeparator) {
                return null; // strictly inside the synthetic separator
            }
            return { pos: seg.from + (offset - cursor), segmentIndex: i };
        }
        cursor += segLen;
    }
    return null;
}

export type DecorationSpec = {
    id: string;
    type: AdvisorThread["type"];
    status: AdvisorThread["status"];
    active: boolean;
    from: number;
    to: number;
    /**
     * True for synthetic markers drawn over the intersection of two threads.
     * They carry no thread id, so click handling ignores them; they only add
     * the `advisor-mark--overlap` class to the affected segment.
     */
    overlapMarker?: boolean;
    /**
     * True on an overlap marker whose two threads have different types
     * (a violation and a user note). Triggers a distinct style so both
     * colors stay visible in the shared span.
     */
    overlapMixed?: boolean;
    /**
     * On a mixed overlap marker, the type of whichever of the two threads
     * is currently active (if any). Drives the active-state color so the
     * merged segment reflects the actually-selected thread rather than the
     * accidental combination of `--user` + `--active` classes.
     */
    overlapActiveType?: "violation" | "user";
};

/**
 * Builds inline decoration specs for the given threads, mapping plain-text
 * offsets to ProseMirror positions. Ranges are clamped so a decoration
 * never crosses a paragraph boundary (ProseMirror forbids that); a thread
 * spanning multiple paragraphs contributes one decoration per touched
 * paragraph.
 */
export function buildDecorationSpecs(
    doc: PmNode,
    threads: AdvisorThread[],
    activeId: string | null,
): DecorationSpec[] {
    const segments = advisorSegments(doc);
    const specs: DecorationSpec[] = [];

    for (const thread of threads) {
        const from = clampOffset(segments, thread.range.start);
        const to = clampOffset(segments, thread.range.end);
        if (from === null || to === null) {
            continue;
        }

        for (const piece of splitByParagraph(segments, from, to)) {
            if (piece.to <= piece.from) {
                continue;
            }
            specs.push({
                id: thread.id,
                type: thread.type,
                status: thread.status,
                active: thread.id === activeId,
                from: piece.from,
                to: piece.to,
            });
        }
    }

    // Emit a marker over each intersection of two different threads so the
    // overlap region is visually distinguishable (see .advisor-mark--overlap).
    // ProseMirror merges active decorations' classes per text segment, so a
    // marker active only on the intersection marks exactly the overlap span.
    const markers: DecorationSpec[] = [];
    for (let i = 0; i < specs.length; i++) {
        for (let j = i + 1; j < specs.length; j++) {
            const a = specs[i];
            const b = specs[j];
            if (!a || !b || a.id === b.id) {
                continue;
            }
            const from = Math.max(a.from, b.from);
            const to = Math.min(a.to, b.to);
            if (to > from) {
                const activePiece = a.active ? a : b.active ? b : null;
                markers.push({
                    id: `overlap-${i}-${j}`,
                    type: a.type,
                    status: a.status,
                    active: false,
                    from,
                    to,
                    overlapMarker: true,
                    overlapMixed: a.type !== b.type,
                    overlapActiveType: activePiece
                        ? activePiece.type
                        : undefined,
                });
            }
        }
    }

    return [...specs, ...markers];
}

export function clampOffset(
    segments: Segment[],
    offset: number,
): { pos: number; segmentIndex: number } | null {
    if (segments.length === 0) {
        return null;
    }
    const total = segments.reduce((n, s) => n + s.text.length, 0);
    const safe = Math.max(0, Math.min(offset, total));
    return offsetToPos(segments, safe);
}

/**
 * Splits a `[from, to]` position range (both inclusive of valid segment
 * indices) into per-paragraph contiguous pieces.
 */
export function splitByParagraph(
    segments: Segment[],
    from: { pos: number; segmentIndex: number },
    to: { pos: number; segmentIndex: number },
): { from: number; to: number }[] {
    const pieces: { from: number; to: number }[] = [];

    let pieceStart: number | null = null;

    for (let i = from.segmentIndex; i <= to.segmentIndex; i++) {
        const seg = segments[i];
        if (!seg) {
            break;
        }

        if (seg.from === seg.to) {
            // Separator closes any open piece.
            if (pieceStart !== null) {
                pieces.push({ from: pieceStart, to: seg.from });
                pieceStart = null;
            }
            continue;
        }

        if (pieceStart === null) {
            pieceStart = i === from.segmentIndex ? from.pos : seg.from;
        }

        if (i === to.segmentIndex) {
            pieces.push({ from: pieceStart, to: to.pos });
            pieceStart = null;
        }
    }

    if (pieceStart !== null) {
        const last = segments[Math.min(to.segmentIndex, segments.length - 1)];
        if (last) {
            pieces.push({ from: pieceStart, to: last.to });
        }
    }

    return pieces.filter((p) => p.to > p.from);
}

export type SelectionInfo = {
    from: number;
    to: number;
    startOffset: number;
    endOffset: number;
    text: string;
};

/**
 * Extracts the current selection as both ProseMirror positions and
 * plain-text offsets (relative to `serializeAdvisorText`), plus the
 * selected text. Returns `null` for a collapsed selection.
 */
export function selectionInfo(
    doc: PmNode,
    from: number,
    to: number,
): SelectionInfo | null {
    if (from === to) {
        return null;
    }
    const segments = advisorSegments(doc);
    const text = serializeAdvisorText(doc);

    const startOffset = posToOffset(segments, from);
    const endOffset = posToOffset(segments, to);
    if (startOffset === null || endOffset === null) {
        return null;
    }

    const lo = Math.min(startOffset, endOffset);
    const hi = Math.max(startOffset, endOffset);

    return {
        from: Math.min(from, to),
        to: Math.max(from, to),
        startOffset: lo,
        endOffset: hi,
        text: text.slice(lo, hi),
    };
}

function posToOffset(segments: Segment[], pos: number): number | null {
    let cursor = 0;
    for (const seg of segments) {
        if (pos >= seg.from && pos <= seg.to) {
            if (seg.from === seg.to) {
                return null;
            }
            return cursor + (pos - seg.from);
        }
        cursor += seg.text.length;
    }
    return null;
}

/** Anything anchored to a half-open `[start, end)` plain-text range. */
export type RangedItem = { range: { start: number; end: number } };

/**
 * Reflows every item's plain-text Range through a ProseMirror transaction's
 * mapping, so edits keep ranges anchored to the right text. Ranges whose text
 * was deleted or fully replaced collapse and are flagged with `start = -1` so
 * the caller can auto-dismiss them. Mutates `items` in place.
 *
 * Generic over anything shaped like {@link RangedItem} — both
 * `AdvisorThread` (violation/user marks) and `SimplifyRange` (unconverged
 * simplification passages, see `simplifyRanges.ts`) satisfy it, so the two
 * decoration systems share this exact reflow engine instead of each
 * reimplementing it.
 *
 * This is what lets the Editor stay editable while marks are present
 * (Word-like): ranges follow the text instead of going stale.
 */
export function reflowAdvisorRanges<T extends RangedItem>(
    oldDoc: PmNode,
    newDoc: PmNode,
    mapping: Mapping,
    items: T[],
): void {
    const oldSegs = advisorSegments(oldDoc);
    const newSegs = advisorSegments(newDoc);

    for (const item of items) {
        const fromPos = offsetToPos(oldSegs, item.range.start);
        const toPos = offsetToPos(oldSegs, item.range.end);
        if (fromPos === null || toPos === null) {
            continue;
        }

        // Auto-dismiss if the tracked span was consumed by a delete/replace step.
        const deletedAtStart = mapping.mapResult(fromPos.pos, 1).deletedAfter;
        const deletedAtEnd = mapping.mapResult(toPos.pos, -1).deletedBefore;
        if (deletedAtStart && deletedAtEnd) {
            item.range = { start: -1, end: -1 };
            continue;
        }

        const mappedFrom = mapping.map(fromPos.pos);
        // Map the exclusive end with left-association so an insert exactly at
        // the boundary is treated as outside the range (it shouldn't grow the
        // violation/note span).
        const mappedTo = mapping.map(toPos.pos, -1);
        const newStart = posToOffset(newSegs, mappedFrom);
        const newEnd = posToOffset(newSegs, mappedTo);

        if (newStart === null || newEnd === null || newEnd <= newStart) {
            // The range's text was deleted or fully replaced → auto-dismiss.
            item.range = { start: -1, end: -1 };
            continue;
        }

        item.range = {
            start: Math.min(newStart, newEnd),
            end: Math.max(newStart, newEnd),
        };
    }
}
