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
    type SimplifyTextCommand,
} from "~/assets/models/commands";
import { useUseProgressIndication } from "~/composables/useProgressIndication";
import type { MappedUnconvergedRange } from "~/utils/simplifyRanges";

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
export type WorkspaceProgress =
    | "none"
    | "checking"
    | "generating"
    | "fixing"
    | "simplifying";

/** Which category produced the current diff review. */
type DiffMode = "transform" | "fix" | "simplify";

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
    const {
        run: runSimplify,
        abort: abortSimplify,
        simplifiedText,
        progress: simplifyProgress,
        result: simplifyResult,
    } = useSimplify();
    const simplifyRangesApi = useSimplifyRanges();
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
     * Runs the simplification loop and enters the diff review. Unlike a quick
     * action the backend streams *events*, not text: WHOLE mode lands the whole
     * result at `done`, CHUNKED mode finalizes paragraph by paragraph. Both are
     * mirrored into {@link correctedText} through the composable's assembled
     * text, so the existing DiffViewer handles the rest.
     */
    async function runSimplification(): Promise<void> {
        const source = text.value;

        diffMode.value = "simplify";
        progress.value = "simplifying";

        addProgress("simplify", {
            icon: "i-lucide-book-open",
            title: t("simplify.running"),
        });

        /**
         * Enters the diff review with the text known so far. Deliberately
         * deferred until there *is* text: unlike a quick action, a simplify
         * run produces nothing for tens of seconds (WHOLE mode produces
         * nothing at all before `done`), and an empty diff review would show
         * either a blank page or the whole document struck through. Until
         * then the editor stays on screen under the progress overlay, the way
         * an Advisor Check does.
         */
        function enterDiffReview(correctedValue: string): void {
            if (state.value !== "diff-review") {
                originalText.value = source;
                state.value = "diff-review";
                diffKey.value++;
            }
            correctedText.value = correctedValue;
        }

        // Mirror the composable's assembled text into the diff review. The
        // reset to "" at the start of a run is not mirrored.
        const stopMirroring = watch(simplifiedText, (value) => {
            if (value !== "") {
                enterDiffReview(value);
            }
        });

        try {
            const finished = await runSimplify(source);
            // An empty `done.text` is a backend failure. Enter the diff review
            // with an empty corrected text, which is the state the DiffViewer
            // renders as "something went wrong". See ADR 0003.
            if (finished && simplifyResult.value?.text === "") {
                enterDiffReview("");
            }
        } catch (error: unknown) {
            console.error("Simplification failed:", error);
            const message =
                error instanceof Error ? error.message : String(error);
            toast.add({
                title: t("simplify.failed"),
                description: message,
                color: "error",
                icon: "i-lucide-alert-circle",
                duration: 5000,
            });
            state.value = "editable";
        } finally {
            stopMirroring();
            removeProgress("simplify");
            progress.value = "none";
        }
    }

    onCommand<SimplifyTextCommand>(Cmds.SimplifyTextCommand, async () => {
        await runSimplification();
    });

    /**
     * Re-runs the last quick action: discards the current diff first so the
     * original text is the baseline again, then runs the same request.
     */
    onCommand<RetryQuickActionCommand>(
        Cmds.RetryQuickActionCommand,
        async () => {
            // A simplify diff retries the loop, not the quick action registry.
            if (diffMode.value === "simplify") {
                abortSimplify();
                correctedText.value = "";
                originalText.value = "";
                state.value = "editable";
                await runSimplification();
                return;
            }

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

        // Any *other* operation that actually rewrote the text invalidates the
        // unconverged-passage highlights the same way — they are only ever
        // (re)established by commitSimplifyDiff, right after this call, for a
        // simplify commit.
        if (diffMode.value !== "simplify" && textChanged) {
            simplifyRangesApi.clear();
        }
    }

    /**
     * Commits a simplification diff and (re)establishes the unconverged-
     * passage highlights from the loop's `unconverged_ranges`, already
     * remapped by the caller from `done.text` offsets onto `resolvedText`
     * (DiffViewer's `mapUnconvergedRanges` — see its doc comment for how a
     * rejected hunk shifts or drops a range).
     */
    function commitSimplifyDiff(
        resolvedText: string,
        mappedUnconvergedRanges: MappedUnconvergedRange[],
    ): void {
        commitDiff(resolvedText);
        simplifyRangesApi.setRanges(mappedUnconvergedRanges);
    }

    /**
     * Leaves the Diff Review without altering the Working Text. Used by the
     * "Back to text" button when the corrected text held no changes (no-op)
     * or came back empty (error). Delegates to commitDiff so cleanup parity
     * (clearing fix-mode threads, resetting state/original/corrected) is
     * preserved. See ADR 0003.
     *
     * A no-op simplify dismiss still (re)establishes the highlights: the
     * corrected text equals the original one-for-one there (no hunks to map
     * through), so the loop's raw `unconverged_ranges` already address the
     * Working Text the dismiss leaves in place — e.g. a document that was
     * already at target but still has a couple of dense paragraphs.
     */
    function exitDiffReview(): void {
        if (state.value !== "diff-review") {
            return;
        }
        if (diffMode.value === "simplify") {
            const raw = simplifyResult.value?.unconverged_ranges ?? [];
            commitDiff(originalText.value);
            simplifyRangesApi.setRanges(raw);
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
        diffMode: readonly(diffMode),
        /** Loop progress of the running simplification (T6.4). */
        simplifyProgress,
        /** `done` event of the last simplification, incl. before/after scores. */
        simplifyResult,
        selectedDocs,
        checkProgress: readonly(checkProgress),
        editable,
        decorationsEnabled,
        isBusy,
        threads,
        activeThreadId,
        commitDiff,
        commitSimplifyDiff,
        exitDiffReview,
        /** Unconverged passages (T6.7), in document order, and the nav state. */
        simplifyRanges: simplifyRangesApi.orderedRanges,
        activeSimplifyRangeId: simplifyRangesApi.activeRangeId,
        activeSimplifyRangeIndex: simplifyRangesApi.activeIndex,
        nextSimplifyRange: simplifyRangesApi.next,
        prevSimplifyRange: simplifyRangesApi.prev,
    };
}
