import { diffWordsWithSpace } from "diff";
import type { DiffHunk } from "~/types/diff";

/**
 * A renderable slice of a diff: either unchanged text flowing between
 * changes, or a change hunk carrying its accept/reject state.
 */
export type DiffSegment =
    | { kind: "text"; value: string }
    | { kind: "change"; hunk: DiffHunk };

/**
 * Builds an ordered list of diff segments (unchanged text interleaved with
 * change hunks) by comparing `original` against `corrected`.
 *
 * `diffWordsWithSpace` preserves whitespace inside its tokens, so summing the
 * length of every "added" and unchanged part walks the corrected text exactly.
 * The resulting `from`/`to` offsets therefore match real text positions, which
 * is the same offset space the editor's `ApplyTextCommand` operates in.
 *
 * Adjacent word-level changes are then **grouped into a single hunk** when the
 * only text between them is whitespace, so a rewritten phrase such as
 * "hav went" → "have gone" becomes one accept/reject unit instead of two
 * separate word toggles. Changes separated by real (non-whitespace) text stay
 * independent, keeping distinct errors in the same sentence reviewable on
 * their own. Because the merged `removedText`/`addedText` both carry the shared
 * whitespace gap, offsets and the resolved/reverted text remain exact for both
 * the "preview then apply" advisor path and the offset-based rewrite path.
 */
export function buildDiffSegments(
    original: string,
    corrected: string,
): DiffSegment[] {
    if (original === "" && corrected === "") {
        return [];
    }

    const parts = diffWordsWithSpace(original, corrected);
    const raw: DiffSegment[] = [];
    let correctedPos = 0;
    let pendingRemoved = "";
    let textBuffer = "";

    function flushText(): void {
        if (textBuffer !== "") {
            raw.push({ kind: "text", value: textBuffer });
            textBuffer = "";
        }
    }

    function pushChange(removedText: string, addedText: string): void {
        const from = correctedPos;
        correctedPos += addedText.length;
        raw.push({
            kind: "change",
            hunk: {
                key: `${removedText}::${addedText}`,
                from,
                to: from + addedText.length,
                removedText,
                addedText,
                status: "pending",
            },
        });
    }

    for (const part of parts) {
        if (part.added) {
            flushText();
            pushChange(pendingRemoved, part.value);
            pendingRemoved = "";
        } else if (part.removed) {
            flushText();
            pendingRemoved += part.value;
        } else {
            flushText();
            if (pendingRemoved !== "") {
                pushChange(pendingRemoved, "");
                pendingRemoved = "";
            }
            textBuffer += part.value;
            correctedPos += part.value.length;
        }
    }

    flushText();
    if (pendingRemoved !== "") {
        pushChange(pendingRemoved, "");
    }

    return groupSegments(raw);
}

/**
 * A gap is absorbable into an in-progress run when it is whitespace-only (or
 * empty). Such a gap is identical on both the original and corrected side, so
 * folding it into a merged hunk does not alter accept/reject semantics — it
 * simply lets adjacent edits in the same phrase share a single decision.
 */
function isAbsorbableGap(value: string): boolean {
    return /^\s*$/.test(value);
}

/**
 * Coalesces consecutive change segments — including any whitespace-only text
 * gap sitting between two changes — into one merged hunk. Directly adjacent
 * changes and changes bridged by an absorbable gap belong to the same unit;
 * real text between changes (or leading/trailing whitespace) is left as
 * standalone `text` segments.
 */
function groupSegments(raw: DiffSegment[]): DiffSegment[] {
    const grouped: DiffSegment[] = [];
    let i = 0;

    while (i < raw.length) {
        const segment = raw[i];
        if (segment === undefined || segment.kind !== "change") {
            if (segment !== undefined) {
                grouped.push(segment);
            }
            i++;
            continue;
        }

        const from = segment.hunk.from;
        let removedText = segment.hunk.removedText;
        let addedText = segment.hunk.addedText;
        let j = i + 1;

        for (;;) {
            const at = raw[j];
            // Directly adjacent change (no text gap at all).
            if (at && at.kind === "change") {
                removedText += at.hunk.removedText;
                addedText += at.hunk.addedText;
                j++;
                continue;
            }
            // Whitespace-only gap immediately followed by another change.
            const gapSeg = at;
            const nextSeg = raw[j + 1];
            if (
                gapSeg !== undefined &&
                gapSeg.kind === "text" &&
                nextSeg !== undefined &&
                nextSeg.kind === "change" &&
                isAbsorbableGap(gapSeg.value)
            ) {
                const gap = gapSeg.value;
                removedText += gap + nextSeg.hunk.removedText;
                addedText += gap + nextSeg.hunk.addedText;
                j += 2;
                continue;
            }
            break;
        }

        grouped.push({
            kind: "change",
            hunk: {
                key: `${removedText}::${addedText}`,
                from,
                to: from + addedText.length,
                removedText,
                addedText,
                status: "pending",
            },
        });
        i = j;
    }

    return grouped;
}

/**
 * Returns only the change hunks (in document order), dropping unchanged text.
 * Convenient for callers that only need the decisions (e.g. bulk reverts).
 */
export function buildDiffHunks(
    original: string,
    corrected: string,
): DiffHunk[] {
    return buildDiffSegments(original, corrected)
        .filter(
            (segment): segment is { kind: "change"; hunk: DiffHunk } =>
                segment.kind === "change",
        )
        .map((segment) => segment.hunk);
}
