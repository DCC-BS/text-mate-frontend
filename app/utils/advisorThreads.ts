import type { AdvisorThread } from "~/assets/models/advisor";

/**
 * Returns the id of the first thread whose range intersects `[start,end)`,
 * if any — used by the "reply vs new thread" heuristic.
 */
export function threadOverlapping(
    threads: AdvisorThread[],
    start: number,
    end: number,
): string | null {
    const hit = threads.find((t) => t.range.start < end && t.range.end > start);
    return hit?.id ?? null;
}
