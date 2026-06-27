import type {
    AdvisorNote,
    AdvisorPhase,
    AdvisorRange,
    AdvisorRuleViolation,
    AdvisorThread,
    AdvisorThreadStatus,
} from "~/assets/models/advisor";

import type { AdvisorDocumentDescription } from "~~/shared/types/advisor";

/**
 * Shared advisor state for the `/advisor` page: editor text, lifecycle
 * phase, the document ruleset, the unified thread list and the fix/diff
 * payload. Held in Pinia rather than prop-drilled through the command bus
 * because the editor (marks), the rail and the diff viewer all read and
 * mutate the same threads.
 */
export const useAdvisorStore = defineStore("advisor", () => {
    // ── editor text ──────────────────────────────────────────────────
    const text = ref("");
    const limit = 100_000;

    function setText(value: string): void {
        text.value = value;
    }

    // ── phase / lifecycle ────────────────────────────────────────────
    const phase = ref<AdvisorPhase>("edit");
    const isChecking = ref(false);
    const isFixing = ref(false);
    const checkedCount = ref(0);
    const totalCount = ref(0);

    // snapshot of the text the last validation ran against — used as the
    // diff baseline and to detect "text changed — re-check".
    const originalText = ref("");
    const correctedText = ref<string | null>(null);

    function setPhase(next: AdvisorPhase): void {
        phase.value = next;
    }

    // ── ruleset ──────────────────────────────────────────────────────
    const selectedDocIds = ref<string[]>([]);

    function selectDocs(ids: string[]): void {
        selectedDocIds.value = ids.slice(0, 5);
    }

    // ── threads ──────────────────────────────────────────────────────
    const threads = ref<AdvisorThread[]>([]);
    const activeThreadId = ref<string | null>(null);

    const sortedThreads = computed<AdvisorThread[]>(() =>
        [...threads.value].sort((a, b) => a.range.start - b.range.start),
    );

    const toFixThreads = computed<AdvisorThread[]>(() =>
        threads.value.filter((t) => t.status === "to-fix"),
    );

    const skipCount = computed(
        () => threads.value.filter((t) => t.status === "skip").length,
    );

    /**
     * Resolves a character range for a violation. Prefers an explicit
     * backend-provided range, falls back to locating the `source` snippet
     * in the text, and finally to an empty range so the thread still
     * renders in the rail.
     */
    function resolveRange(
        text: string,
        rule: AdvisorRuleViolation,
    ): AdvisorRange {
        if (rule.range) {
            return { ...rule.range };
        }

        if (rule.source) {
            const start = text.indexOf(rule.source);
            if (start >= 0) {
                return { start, end: start + rule.source.length };
            }
        }

        return { start: 0, end: 0 };
    }

    /**
     * Ingests a streamed validation result, converting each violation into
     * a unified thread. Existing user threads are preserved; violation
     * threads are replaced wholesale on a fresh check.
     */
    function loadViolations(rules: AdvisorRuleViolation[]): void {
        const userThreads = threads.value.filter((t) => t.type === "user");

        const violationThreads: AdvisorThread[] = rules.map((rule) => ({
            id: `v-${crypto.randomUUID()}`,
            range: resolveRange(originalText.value, rule),
            type: "violation",
            status: "to-fix",
            rule_name: rule.name,
            description: rule.description,
            reason: rule.reason,
            proposal: rule.proposal,
            source: rule.source,
            file_name: rule.file_name,
            page_number: rule.page_number,
            collection: rule.collection,
            notes: [],
        }));

        threads.value = [...violationThreads, ...userThreads];
        activeThreadId.value = violationThreads[0]?.id ?? null;
    }

    /**
     * Creates a user thread from an editor selection. `overlap` is the id
     * of an existing thread whose range intersects the selection, in which
     * case the caller should instead append a note via `addNote`.
     */
    function addUserThread(range: AdvisorRange, source: string): AdvisorThread {
        const thread: AdvisorThread = {
            id: `u-${crypto.randomUUID()}`,
            range,
            type: "user",
            status: "to-fix",
            source,
            notes: [],
        };
        threads.value = [...threads.value, thread];
        activeThreadId.value = thread.id;
        return thread;
    }

    /**
     * Returns the id of the first thread whose range intersects `[start,end)`,
     * if any — used by the "reply vs new thread" heuristic.
     */
    function threadOverlapping(start: number, end: number): string | null {
        const hit = threads.value.find(
            (t) => t.range.start < end && t.range.end > start,
        );
        return hit?.id ?? null;
    }

    function setStatus(id: string, status: AdvisorThreadStatus): void {
        const thread = threads.value.find((t) => t.id === id);
        if (thread) {
            thread.status = status;
        }
    }

    function setActive(id: string | null): void {
        activeThreadId.value = id;
    }

    function addNote(id: string, textValue: string): void {
        const thread = threads.value.find((t) => t.id === id);
        if (!thread || textValue.trim() === "") {
            return;
        }
        const note: AdvisorNote = {
            id: crypto.randomUUID(),
            author: "you",
            text: textValue.trim(),
        };
        thread.notes = [...thread.notes, note];
    }

    function editNote(id: string, noteId: string, textValue: string): void {
        const thread = threads.value.find((t) => t.id === id);
        const note = thread?.notes.find((n) => n.id === noteId);
        if (note && textValue.trim() !== "") {
            note.text = textValue.trim();
        }
    }

    function deleteNote(id: string, noteId: string): void {
        const thread = threads.value.find((t) => t.id === id);
        if (!thread) {
            return;
        }
        thread.notes = thread.notes.filter((n) => n.id !== noteId);
    }

    // ── apply / diff ─────────────────────────────────────────────────
    function beginApply(): void {
        isFixing.value = true;
    }

    function setCorrectedText(value: string): void {
        correctedText.value = value;
        isFixing.value = false;
        phase.value = "diff";
    }

    /**
     * Finalises an accepted diff: replaces the editor text, clears threads
     * and moves to the terminal `done` phase (manual re-check only).
     */
    function commitApply(nextText: string): void {
        text.value = nextText;
        originalText.value = nextText;
        threads.value = [];
        activeThreadId.value = null;
        correctedText.value = null;
        phase.value = "done";
    }

    function cancelApply(): void {
        correctedText.value = null;
        phase.value = "review";
    }

    /**
     * Returns to `edit` so the user can adjust the text; clears any prior
     * review state since marks would be stale against new text.
     */
    function resetToEdit(): void {
        threads.value = [];
        activeThreadId.value = null;
        correctedText.value = null;
        checkedCount.value = 0;
        totalCount.value = 0;
        phase.value = "edit";
    }

    return {
        // state
        text,
        limit,
        phase,
        isChecking,
        isFixing,
        checkedCount,
        totalCount,
        originalText,
        correctedText,
        selectedDocIds,
        threads,
        activeThreadId,
        // getters
        sortedThreads,
        toFixThreads,
        skipCount,
        // actions
        setText,
        setPhase,
        selectDocs,
        loadViolations,
        addUserThread,
        threadOverlapping,
        setStatus,
        setActive,
        addNote,
        editNote,
        deleteNote,
        beginApply,
        setCorrectedText,
        commitApply,
        cancelApply,
        resetToEdit,
    };
});

export type { AdvisorDocumentDescription };
