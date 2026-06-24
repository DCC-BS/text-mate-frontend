import type {
    AdvisorCheckViolation,
    AdvisorRange,
    AdvisorThread,
    AdvisorThreadStatus,
} from "~/types/advisorV2";

let uidCounter = 0;
function nextId(prefix: string): string {
    uidCounter += 1;
    return `${prefix}${uidCounter}`;
}

/**
 * Reactive store for advisor comment threads and the currently focused thread.
 *
 * Holds both violation threads (from the check stream) and user threads (free
 * comments on a range), plus all the mutations the rail and editor need:
 * status toggles, notes/replies and add/delete.
 */
export function useAdvisorThreads() {
    const threads = ref<AdvisorThread[]>([]);
    const focusedId = ref<string | null>(null);

    const toFixCount = computed(
        () => threads.value.filter((t) => t.status === "to-fix").length,
    );
    const skippedCount = computed(
        () => threads.value.length - toFixCount.value,
    );

    function threadById(id: string): AdvisorThread | undefined {
        return threads.value.find((t) => t.id === id);
    }

    /** Replaces all violation threads with a fresh set from the check stream. */
    function setViolations(violations: AdvisorCheckViolation[]): void {
        threads.value = violations.map(
            (violation): AdvisorThread => ({
                id: nextId("v"),
                type: "violation",
                status: "to-fix",
                range: { ...violation.range },
                rule_name: violation.rule_name,
                collection: violation.collection,
                reason: violation.reason,
                proposal: violation.proposal,
                file_name: violation.file_name,
                page_number: violation.page_number,
                notes: [],
            }),
        );
        focusedId.value = threads.value[0]?.id ?? null;
    }

    function focusThread(id: string | null): void {
        focusedId.value = id;
    }

    function setStatus(id: string, status: AdvisorThreadStatus): void {
        const thread = threadById(id);
        if (thread) {
            thread.status = status;
            focusedId.value = id;
        }
    }

    function deleteThread(id: string): void {
        threads.value = threads.value.filter((t) => t.id !== id);
        if (focusedId.value === id) {
            focusedId.value = null;
        }
    }

    /** Adds a free user comment on the given range and focuses it. */
    function addUserThread(range: AdvisorRange, text: string): string {
        const thread: AdvisorThread = {
            id: nextId("u"),
            type: "user",
            status: "to-fix",
            range: { ...range },
            notes: [{ id: nextId("n"), author: "user", text }],
        };
        threads.value = [...threads.value, thread];
        focusedId.value = thread.id;
        return thread.id;
    }

    function addNote(id: string, text: string): void {
        const thread = threadById(id);
        if (!thread) {
            return;
        }
        thread.notes = [
            ...thread.notes,
            { id: nextId("n"), author: "user", text },
        ];
        focusedId.value = id;
    }

    function updateNote(threadId: string, noteId: string, text: string): void {
        const thread = threadById(threadId);
        if (!thread) {
            return;
        }
        const trimmed = text.trim();
        thread.notes = trimmed
            ? thread.notes.map((n) =>
                  n.id === noteId ? { ...n, text: trimmed } : n,
              )
            : thread.notes.filter((n) => n.id !== noteId);
    }

    function deleteNote(threadId: string, noteId: string): void {
        const thread = threadById(threadId);
        if (thread) {
            thread.notes = thread.notes.filter((n) => n.id !== noteId);
        }
    }

    function clear(): void {
        threads.value = [];
        focusedId.value = null;
    }

    return {
        threads,
        focusedId,
        toFixCount,
        skippedCount,
        threadById,
        setViolations,
        focusThread,
        setStatus,
        deleteThread,
        addUserThread,
        addNote,
        updateNote,
        deleteNote,
        clear,
    };
}
