import type { FixThread } from "#shared/types/advisor";
import {
    type AbandonDiffCommand,
    type ApplyFixCommand,
    type CheckCommand,
    ClearThreadsCommand,
    Cmds,
    ExecuteTextActionCommand,
    type RetryQuickActionCommand,
    type SeedExampleDiffCommand,
} from "~/assets/models/commands";
import { useUseProgressIndication } from "~/composables/useProgressIndication";

/**
 * The two durable workspace states. The Editor is editable in `editable`; it is
 * replaced by the DiffViewer (and locked) in `diff-review`.
 */
export type WorkspaceState = "editable" | "diff-review";

/**
 * Transient overlay shown during a streaming operation. Does not gate
 * editability on its own — only `diff-review` does — but drives the progress
 * indicator and disables the ribbon actions.
 */
export type WorkspaceProgress = "none" | "checking" | "generating" | "fixing";

/** Which category produced the current diff review. */
type DiffMode = "transform" | "fix";

// Module-level singleton state: the workspace is mounted once per page.
const state = ref<WorkspaceState>("editable");
const progress = ref<WorkspaceProgress>("none");
const originalText = ref("");
const correctedText = ref("");
/** Bumped on every new diff so the DiffViewer remounts with a fresh status map. */
const diffKey = ref(0);
const diffMode = ref<DiffMode>("transform");
const selectedDocs = ref<string[]>([]);
const checkProgress = ref({ checked: 0, total: 1 });

export function useWorkspace(text: Ref<string>) {
    const { t } = useI18n();
    const toast = useToast();
    const { addProgress, removeProgress } = useUseProgressIndication();
    const { validate, fix } = useAdvisor();
    const { threads, activeThreadId, addThread, clearViolationThreads } =
        useAdvisorRevision();
    const { runQuickAction, lastRequest } = useQuickAction();
    const { onCommand, executeCommand } = useCommandBus();

    let fixAbort: AbortController | null = null;

    const editable = computed(
        () => state.value === "editable" && progress.value === "none",
    );

    // Decorations render whenever threads exist and the editor is visible
    // (i.e. not during a diff review).
    const decorationsEnabled = computed(
        () => threads.value.length > 0 && state.value === "editable",
    );

    const isBusy = computed(() => progress.value !== "none");

    /**
     * Streams a Transform quick action's result into the diff review. The
     * editor is NOT touched during streaming — the corrected text accumulates
     * in {@link correctedText} and is committed (or discarded) once the user
     * resolves the diff.
     */
    onCommand<ExecuteTextActionCommand>(
        Cmds.ExecuteTextActionCommand,
        async (command) => {
            originalText.value = text.value;
            correctedText.value = "";
            diffMode.value = "transform";
            state.value = "diff-review";
            diffKey.value++;
            progress.value = "generating";

            addProgress("quick-action", {
                icon: "i-lucide-text-search",
                title: t("status.quickAction"),
            });

            try {
                const reader = command.stream.getReader();
                const decoder = new TextDecoder();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    correctedText.value += decoder.decode(value, {
                        stream: true,
                    });
                }
            } finally {
                removeProgress("quick-action");
                progress.value = "none";
                // Stay in diff-review even on a no-op or empty result so the
                // DiffViewer can surface an explicit "no changes" / error
                // hint instead of vanishing silently. The user leaves via
                // exitDiffReview() (the "Back to text" button).
            }
        },
    );

    /**
     * Re-runs the last quick action: discards the current diff first so the
     * original text is the baseline again, then runs the same request.
     */
    onCommand<RetryQuickActionCommand>(
        Cmds.RetryQuickActionCommand,
        async () => {
            if (!lastRequest.value) {
                return;
            }
            // Discard the in-progress diff (revert to original) then re-run.
            correctedText.value = "";
            originalText.value = "";
            state.value = "editable";
            await runQuickAction(lastRequest.value);
        },
    );

    /**
     * Seeds a fake Diff Review for the onboarding tour without hitting the
     * backend. Builds a synthetic stream from the corrected text (with a small
     * delay so the "Generating…" affordance is visible), then dispatches the
     * real {@link ExecuteTextActionCommand} so the diff-review entry path is
     * reused verbatim. Mirrors the local-seed pattern of `AddThreadCommand`.
     */
    onCommand<SeedExampleDiffCommand>(
        Cmds.SeedExampleDiffCommand,
        async (command) => {
            const encoder = new TextEncoder();
            const stream = new ReadableStream<Uint8Array<ArrayBufferLike>>({
                start(controller) {
                    setTimeout(() => {
                        controller.enqueue(
                            encoder.encode(command.correctedText),
                        );
                        controller.close();
                    }, 500);
                },
            });
            await executeCommand(new ExecuteTextActionCommand(stream));
        },
    );

    /**
     * Abandons an in-progress Diff Review without committing the corrected
     * text. Used by the onboarding tour to reset cleanly.
     */
    onCommand<AbandonDiffCommand>(Cmds.AbandonDiffCommand, async () => {
        originalText.value = "";
        correctedText.value = "";
        state.value = "editable";
    });

    /**
     * Validation: preserves User Threads (notes), replaces Violation Threads.
     * The editor stays editable throughout.
     */
    onCommand<CheckCommand>(Cmds.CheckCommand, async () => {
        clearViolationThreads();
        progress.value = "checking";
        checkProgress.value = { checked: 0, total: 1 };

        try {
            for await (const result of validate(
                text.value,
                selectedDocs.value,
            )) {
                checkProgress.value = {
                    checked: result.checked,
                    total: result.total,
                };
                for (const thread of result.threads) {
                    addThread(thread);
                }
            }
        } catch (error: unknown) {
            console.error("Advisor validation failed:", error);
            const message =
                error instanceof Error ? error.message : String(error);
            toast.add({
                title: t("advisor.checkFailed"),
                description: message,
                color: "error",
                icon: "i-lucide-alert-circle",
                duration: 5000,
            });
        } finally {
            progress.value = "none";
        }
    });

    /**
     * Generates the corrected Working Text from every to-fix thread and enters
     * the diff review. Threads are cleared once the user commits the diff (the
     * corrected text no longer matches the old ranges).
     */
    onCommand<ApplyFixCommand>(Cmds.ApplyFixCommand, async () => {
        if (threads.value.filter((x) => x.status === "to-fix").length === 0) {
            return;
        }

        fixAbort?.abort();
        const abortController = new AbortController();
        fixAbort = abortController;

        const original = text.value;
        originalText.value = original;
        correctedText.value = "";
        diffMode.value = "fix";
        progress.value = "fixing";

        const fixThreads: FixThread[] = threads.value
            .filter((thread) => thread.status === "to-fix")
            .map((thread) => ({
                notes: thread.notes.map((note) => note.text),
                proposal: thread.violation?.proposal,
                reason: thread.violation?.reason,
                source: original.slice(thread.range.start, thread.range.end),
            }));

        addProgress("advisor-fix", {
            icon: "i-lucide-wrench",
            title: t("workspace.fixing"),
        });

        try {
            state.value = "diff-review";
            diffKey.value++;

            for await (const chunk of fix(
                original,
                fixThreads,
                abortController.signal,
            )) {
                if (abortController.signal.aborted) {
                    break;
                }
                correctedText.value += chunk;
            }

            // No commitIfUnchanged() here: a no-op or empty result stays in
            // diff-review so the DiffViewer can show a hint. See ADR 0003.
        } catch (error: unknown) {
            console.error("Advisor fix failed:", error);
            const message =
                error instanceof Error ? error.message : String(error);
            toast.add({
                title: t("advisor.checkFailed"),
                description: message,
                color: "error",
                icon: "i-lucide-alert-circle",
                duration: 5000,
            });
            state.value = "editable";
        } finally {
            removeProgress("advisor-fix");
            progress.value = "none";
        }
    });

    /**
     * Commits the resolved text (corrected text with rejected hunks reverted)
     * as the new Working Text and returns to the editable state.
     */
    function commitDiff(resolvedText: string): void {
        // Capture before resetting originalText below: a fix that landed
        // unchanged (no-op, empty/error response, or every hunk rejected)
        // leaves the old ranges valid, so its threads must be preserved.
        const textChanged = resolvedText !== originalText.value;
        text.value = resolvedText;
        originalText.value = "";
        correctedText.value = "";
        state.value = "editable";

        // A fix rewrites the text, invalidating every thread's range. Transform
        // diffs don't touch threads. See ADR 0003.
        if (diffMode.value === "fix" && textChanged) {
            executeCommand(new ClearThreadsCommand());
        }
    }

    /**
     * Leaves the Diff Review without altering the Working Text. Used by the
     * "Back to text" button when the corrected text held no changes (no-op)
     * or came back empty (error). Delegates to commitDiff so cleanup parity
     * (clearing fix-mode threads, resetting state/original/corrected) is
     * preserved. See ADR 0003.
     */
    function exitDiffReview(): void {
        if (state.value !== "diff-review") {
            return;
        }
        commitDiff(originalText.value);
    }

    return {
        state: readonly(state),
        progress: readonly(progress),
        originalText: readonly(originalText),
        correctedText: readonly(correctedText),
        diffKey: readonly(diffKey),
        selectedDocs,
        checkProgress: readonly(checkProgress),
        editable,
        decorationsEnabled,
        isBusy,
        threads,
        activeThreadId,
        commitDiff,
        exitDiffReview,
    };
}
