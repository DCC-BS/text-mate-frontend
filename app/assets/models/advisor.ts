import type { AdvisorRuleViolation } from "~~/shared/types/advisor";

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
export type AdvisorPhase =
    | "edit"
    | "reviewing"
    | "review"
    | "fixing"
    | "diff"
    | "done";

export type ValidationProgress = {
    checked?: number;
    total?: number;
};

export type AdvisorThreadStatus = "to-fix" | "skip";

export type AdvisorThreadType = "violation" | "user";

export type AdvisorThreadResult = {
    threads: AdvisorThread[];
    checked: number;
    total: number;
};

/**
 * Unified thread model backing the rail, the inline marks and the fix
 * payload. One status per thread — `skip` threads are excluded from the
 * fix request.
 */
export type AdvisorThread = {
    id: string;
    violation?: AdvisorRuleViolation;
    type: AdvisorThreadType;
    status: AdvisorThreadStatus;
    notes: AdvisorNote[];
    range: AdvisorRange;
};

export type FixRequest = {
    text: string;
    threads: FixThread[];
};
