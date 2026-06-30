/**
 * Accept/reject state of a single diff hunk.
 * - "pending": not yet decided, shows old → new plus action buttons.
 * - "accepted": keep the corrected text.
 * - "rejected": keep the original text.
 */
export type HunkStatus = "pending" | "accepted" | "rejected";

/**
 * A single change hunk produced by diffing original against corrected text.
 * Offsets are relative to the corrected text and map directly to the
 * ProseMirror-equivalent positions used by `ApplyTextCommand`.
 */
export interface DiffHunk {
    /** Stable text-based key used to track status across reactive rebuilds. */
    key: string;
    /** Inclusive start offset within the corrected text. */
    from: number;
    /** Exclusive end offset within the corrected text. */
    to: number;
    /** Original text that was replaced. Empty for a pure insertion. */
    removedText: string;
    /** Corrected text that replaced the original. Empty for a pure deletion. */
    addedText: string;
    /** Current accept/reject state. */
    status: HunkStatus;
}
