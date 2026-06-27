// export type AdvisorDocumentDescription = {
//     title: string;
//     description: string;
//     author: string;
//     edition: string;
//     id: string;
//     files: string[];
// };

export type AdvisorRuleViolation = {
    name: string;
    description: string;
    file_name: string;
    page_number: number;
    example: string;
    reason: string;
    proposal: string;
    source: string;
    collection: string;
    /**
     * Absolute character offsets of the matched `source` snippet within the
     * validated text. Absent on the legacy backend; the advisor assumes the
     * validation stream (or DUMMY mode) provides them.
     */
    range?: AdvisorRange;
};

export type ValidationResult = {
    rules: AdvisorRuleViolation[];
    checked?: number;
    total?: number;
};

/**
 * Half-open character range `[start, end)` into the validated text.
 */
export type AdvisorRange = {
    start: number;
    end: number;
};

/**
 * A user-authored reply attached to a thread. The first violation thread
 * implicitly carries the advisor's reason/proposal as context; subsequent
 * notes are user replies.
 */
export type AdvisorNote = {
    id: string;
    author: "advisor" | "you";
    text: string;
};

/**
 * Advisor lifecycle phase. The page editor is editable in `edit`, locked
 * read-only (but selectable) from `review` onward.
 */
export type AdvisorPhase = "edit" | "review" | "diff" | "done";

export type AdvisorThreadStatus = "to-fix" | "skip";

export type AdvisorThreadType = "violation" | "user";

/**
 * Unified thread model backing the rail, the inline marks and the fix
 * payload. One status per thread — `skip` threads are excluded from the
 * fix request.
 */
export type AdvisorThread = {
    id: string;
    range: AdvisorRange;
    type: AdvisorThreadType;
    status: AdvisorThreadStatus;
    // violation-only context
    rule_name?: string;
    description?: string;
    reason?: string;
    proposal?: string;
    source?: string;
    file_name?: string;
    page_number?: number;
    collection?: string;
    // both
    notes: AdvisorNote[];
};

/**
 * Payload sent to `/advisor/fix`. Only `to-fix` threads are shipped; rule
 * definitions are intentionally omitted — the fix LLM receives the text
 * plus per-thread `source` + `proposal`/`reason` + notes only.
 */
// export type FixThread = {
//     source: string;
//     proposal?: string;
//     reason?: string;
//     notes: string[];
// };

export type FixRequest = {
    text: string;
    threads: FixThread[];
};
