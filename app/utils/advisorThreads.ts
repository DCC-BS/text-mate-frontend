import type { AdvisorThread } from "~/assets/models/advisor";

/**
 * Returns the id of the first thread whose range is exactly `[start,end)`,
 * if any — used by the "reply vs new thread" heuristic. A selection that
 * merely overlaps (but is not identical to) an existing thread is treated
 * as a new thread.
 */
export function threadWithSameRange(
    threads: AdvisorThread[],
    start: number,
    end: number,
): string | null {
    const hit = threads.find(
        (t) => t.range.start === start && t.range.end === end,
    );
    return hit?.id ?? null;
}
