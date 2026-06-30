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
 */
export function buildDiffSegments(
    original: string,
    corrected: string,
): DiffSegment[] {
    if (original === "" && corrected === "") {
        return [];
    }

    const parts = diffWordsWithSpace(original, corrected);
    const segments: DiffSegment[] = [];
    let correctedPos = 0;
    let pendingRemoved = "";
    let textBuffer = "";

    function flushText(): void {
        if (textBuffer !== "") {
            segments.push({ kind: "text", value: textBuffer });
            textBuffer = "";
        }
    }

    function pushChange(removedText: string, addedText: string): void {
        const from = correctedPos;
        correctedPos += addedText.length;
        segments.push({
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

    return segments;
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
