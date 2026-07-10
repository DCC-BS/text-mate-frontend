import { v7 } from "uuid";
import type { AdvisorNote, AdvisorThread } from "~/assets/models/advisor";
import {
    AddThreadCommand,
    type AddThreadNoteCommand,
    type AddUserReviewCommand,
    type ChangeActiveThreadId,
    type ChangeThreadNoteCommand,
    type ClearThreadsCommand,
    Cmds,
    type DeleteThreadNoteCommand,
    RemoveThreadCommand,
    type SetThreadStatusCommand,
} from "~/assets/models/commands";

export function useAdvisorRevision() {
    const logger = useLogger();

    const threadsMap = ref<Map<string, AdvisorThread>>(new Map());

    const threads = computed<AdvisorThread[]>(() =>
        threadsMap.value
            .values()
            .toArray()
            .toSorted((a, b) => a.range.start - b.range.start),
    );
    const activeThreadId = ref<string | null>(null);

    const { onCommand, executeCommand } = useCommandBus();

    onCommand<AddUserReviewCommand>(
        Cmds.AddUserReviewCommand,
        async (command) => {
            const thread: AdvisorThread = {
                id: `u-${v7()}`,
                range: command.range,
                type: "user",
                status: "to-fix",
                notes: [],
            };

            await executeCommand(new AddThreadCommand(thread));
        },
    );

    onCommand<AddThreadCommand>(Cmds.AddThreadCommand, async (command) => {
        const newThread = { id: v7(), ...command.thread };

        threadsMap.value.set(newThread.id, newThread);
        activeThreadId.value = newThread.id;
        command.setThread(newThread);
    });

    onCommand<RemoveThreadCommand>(
        Cmds.RemoveThreadCommand,
        async (command) => {
            console.log("remove thread!");

            const success = threadsMap.value.delete(command.thread.id);
            if (!success) {
                logger.warn(
                    `Try to remove a thread which does not exits with the id: ${command.thread.id}`,
                );
            }
            activeThreadId.value = null;
        },
    );

    onCommand<ChangeActiveThreadId>(
        Cmds.ChangeActiveThreadId,
        async (command) => {
            activeThreadId.value = command.threadId;
        },
    );

    onCommand<AddThreadNoteCommand>(
        Cmds.AddThreadNoteCommand,
        async (command) => {
            const thread = threadsMap.value.get(command.threadId);

            if (!thread) {
                logger.error(`Thread ${command.threadId} not found`);
                throw new Error(`Thread ${command.threadId} not found`);
            }

            const newNote: AdvisorNote = {
                id: v7(),
                author: "you",
                text: command.replyText,
            };

            thread.notes.push(newNote);
        },
    );

    onCommand<SetThreadStatusCommand>(
        Cmds.SetThreadStatusCommand,
        async (command) => {
            const thread = threadsMap.value.get(command.threadId);

            if (!thread) {
                logger.error(`Thread ${command.threadId} not found`);
                throw new Error(`Thread ${command.threadId} not found`);
            }

            thread.status = command.status;
        },
    );

    onCommand<ChangeThreadNoteCommand>(
        Cmds.ChangeThreadNoteCommand,
        async (command) => {
            const thread = threadsMap.value.get(command.threadId);

            if (!thread) {
                logger.error(`Thread ${command.threadId} not found`);
                throw new Error(`Thread ${command.threadId} not found`);
            }

            const note = thread.notes.find((n) => n.id === command.noteId);

            if (!note) {
                logger.error(`Note ${command.noteId} not found`);
                throw new Error(`Note ${command.noteId} not found`);
            }

            note.text = command.newText;
        },
    );

    onCommand<DeleteThreadNoteCommand>(
        Cmds.DeleteThreadNoteCommand,
        async (command) => {
            const thread = threadsMap.value.get(command.threadId);

            if (!thread) {
                logger.error(`Thread ${command.threadId} not found`);
                throw new Error(`Thread ${command.threadId} not found`);
            }

            const index = thread.notes.findIndex(
                (n) => n.id === command.noteId,
            );

            if (index === -1) {
                logger.error(`Note ${command.noteId} not found`);
                throw new Error(`Note ${command.noteId} not found`);
            }

            thread.notes.splice(index, 1);

            if (thread.notes.length === 0 && !thread.violation) {
                console.log("delete note");
                await executeCommand(new RemoveThreadCommand(thread));
            }
        },
    );

    onCommand<ClearThreadsCommand>(Cmds.ClearThreadsCommand, async () => {
        threadsMap.value.clear();
        activeThreadId.value = null;
    });

    /**
     * Removes every violation thread, keeping user threads (notes). Used when a
     * Check re-runs: the new validation replaces the old violations, but the
     * user's own notes must survive.
     */
    function clearViolationThreads(): void {
        for (const [id, thread] of threadsMap.value) {
            if (thread.type === "violation") {
                threadsMap.value.delete(id);
            }
        }
        if (!threadsMap.value.has(activeThreadId.value ?? "")) {
            activeThreadId.value = null;
        }
    }

    function addThread(thread: AdvisorThread) {
        threadsMap.value.set(thread.id, thread);
    }

    return {
        threads,
        activeThreadId,
        addThread,
        clearViolationThreads,
    };
}
