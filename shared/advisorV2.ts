/**
 * Shared types for the Advisor v2 (Word-style threaded comments) experience.
 *
 * Lives in `shared/` so both the Nuxt app (`#shared/advisorV2` /
 * `~/types/advisorV2`) and the server endpoints (`#shared/advisorV2`) use the
 * same wire contract.
 *
 * A "thread" is the unit shown as a comment card in the right rail and as an
 * inline highlight in the editor. It is either a rule violation produced by the
 * advisor backend, or a free comment added by the user on a text range.
 */

/** Where a thread originates from. */
export type AdvisorThreadType = "violation" | "user";

/** Per-thread decision the user makes before applying fixes. */
export type AdvisorThreadStatus = "to-fix" | "skip";

/** A character range into the plain submitted text (`editor.getText()`). */
export interface AdvisorRange {
    start: number;
    end: number;
}

/** A user-authored note attached to a thread (comment body or reply). */
export interface AdvisorNote {
    id: string;
    author: "user";
    text: string;
}

/**
 * A single comment thread. Violation threads carry the rule metadata coming
 * from the backend; user threads only carry notes.
 */
export interface AdvisorThread {
    id: string;
    type: AdvisorThreadType;
    status: AdvisorThreadStatus;
    range: AdvisorRange;

    // Violation-only metadata (optional for user threads).
    rule_name?: string;
    collection?: string;
    reason?: string;
    proposal?: string;
    file_name?: string;
    page_number?: number;

    notes: AdvisorNote[];
}

/**
 * A streamed chunk from the `/advisor-v2/check` endpoint. Mirrors the shape of
 * the existing validate stream but adds an explicit `range` per violation so
 * the frontend can anchor inline marks without re-scanning the text.
 */
export interface AdvisorCheckViolation {
    range: AdvisorRange;
    rule_name: string;
    collection: string;
    reason: string;
    proposal: string;
    file_name: string;
    page_number: number;
}

export interface AdvisorCheckChunk {
    violations: AdvisorCheckViolation[];
    checked?: number;
    total?: number;
}

/** A single fix instruction sent to the `/advisor-v2/fix` endpoint. */
export interface AdvisorFixThread {
    /** Snippet the violation applies to (for grounding the LLM). */
    snippet: string;
    rule_name?: string;
    reason?: string;
    proposal?: string;
    /** User notes/comments that should steer the correction. */
    notes: string[];
}

export interface AdvisorFixRequest {
    text: string;
    threads: AdvisorFixThread[];
}
