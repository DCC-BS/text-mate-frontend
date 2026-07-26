import type { Range } from "@tiptap/vue-3";
import type { ICommand, IReversibleCommand } from "#build/types/commands";
import type { TextActions } from "~~/shared/text-actions";
import type { AdvisorThread, AdvisorThreadStatus } from "./advisor";

/**
 * A quick action request that can be re-run (e.g. for retry).
 */
export interface QuickActionRequest {
    action: TextActions | string;
    /** The original text the action was run against. */
    text: string;
    /** Already-composed options string including the language code. */
    options: string;
}

export const Cmds = {
    ApplyTextCommand: "ApplyTextCommand",
    ApplyTextAtOffsetCommand: "ApplyTextAtOffsetCommand",
    RewriteTextCommand: "RewriteTextCommand",
    UndoCommand: "UndoCommand",
    RedoCommand: "RedoCommand",
    UndoRedoStateChanged: "UndoRedoStateChanged",
    ToggleLockEditorCommand: "ToggleLockEditorCommand",
    ExecuteTextActionCommand: "ExecuteTextActionCommand",
    RetryQuickActionCommand: "RetryQuickActionCommand",
    SeedExampleDiffCommand: "SeedExampleDiffCommand",
    AbandonDiffCommand: "AbandonDiffCommand",
    CheckCommand: "CheckCommand",
    ApplyFixCommand: "ApplyFixCommand",
    RestartTourCommand: "RestartTourCommand",
    ClearTextCommand: "ClearTextCommand",
    ShowTextStatsCommand: "ShowTextStatsCommand",
    HideTextStatsCommand: "HideTextStatsCommand",
    AddUserReviewCommand: "AddUserReviewCommand",
    AddThreadCommand: "AddThreadCommand",
    RemoveThreadCommand: "RemoveThreadCommand",
    ChangeActiveThreadId: "ChangeActiveThreadId",
    SetThreadStatusCommand: "SetThreadStatusCommand",
    AddThreadNoteCommand: "AddThreadNoteCommand",
    ChangeThreadNoteCommand: "ChangeThreadNoteCommand",
    DeleteThreadNoteCommand: "DeleteThreadNoteCommand",
    ClearThreadsCommand: "ClearThreadsCommand",
};

export class ClearTextCommand implements ICommand {
    readonly $type = Cmds.ClearTextCommand;
}

/**
 * Command that applies a text change to the text editor
 */
export class ApplyTextCommand implements ICommand {
    readonly $type = Cmds.ApplyTextCommand;

    constructor(
        public text: string,
        public range: Range,
        public addToHistory = true,
    ) {}
}

/**
 * Like {@link ApplyTextCommand}, but the range is expressed as character
 * offsets within `editor.getText()` rather than ProseMirror positions. The
 * editor-side handler translates the offsets before applying. Used by callers
 * that diff the serialised text (e.g. the diff viewer).
 */
export class ApplyTextAtOffsetCommand implements ICommand {
    readonly $type = Cmds.ApplyTextAtOffsetCommand;

    constructor(
        public text: string,
        public from: number,
        public to: number,
        public addToHistory = true,
    ) {}
}

export class RewriteTextCommand implements ICommand {
    readonly $type = Cmds.RewriteTextCommand;

    constructor(
        public text: string,
        public range: Range,
    ) {}
}

export class UndoCommand implements ICommand {
    readonly $type = Cmds.UndoCommand;
}

export class RedoCommand implements ICommand {
    readonly $type = Cmds.RedoCommand;
}

export class UndoRedoStateChanged implements ICommand {
    readonly $type = Cmds.UndoRedoStateChanged;

    constructor(
        public canUndo: boolean,
        public canRedo: boolean,
    ) {}
}

export class ExecuteTextActionCommand implements ICommand {
    readonly $type = Cmds.ExecuteTextActionCommand;

    constructor(public stream: ReadableStream<Uint8Array<ArrayBufferLike>>) {}
}

/**
 * Re-runs the last quick action: rejects the current suggestion and applies the
 * same action to the original text again.
 */
export class RetryQuickActionCommand implements ICommand {
    readonly $type = Cmds.RetryQuickActionCommand;
}

/**
 * Seeds a fake Diff Review for the onboarding tour. Carries the corrected text;
 * the handler builds a synthetic stream and dispatches {@link ExecuteTextActionCommand}.
 * No backend call — mirrors the local-seed pattern of {@link AddThreadCommand}.
 */
export class SeedExampleDiffCommand implements ICommand {
    readonly $type = Cmds.SeedExampleDiffCommand;

    constructor(public correctedText: string) {}
}

export class ShowTextStatsCommand implements ICommand {
    readonly $type = Cmds.ShowTextStatsCommand;
}

export class HideTextStatsCommand implements ICommand {
    readonly $type = Cmds.HideTextStatsCommand;
}

/**
 * Command that applies a text change and can be undone/redone
 */

/**
 * Abandons an in-progress Diff Review, reverting to the editable state without
 * committing any of the corrected text. Used by the onboarding tour to reset.
 */
export class AbandonDiffCommand implements ICommand {
    readonly $type = Cmds.AbandonDiffCommand;
}

/**
 * Runs an Advisor Check (validation) against the selected Reference Documents
 * on the current Working Text. Preserves User Threads, replaces Violation
 * Threads. Dispatched from the Validate ribbon tab.
 */
export class CheckCommand implements ICommand {
    readonly $type = Cmds.CheckCommand;
}

/**
 * Generates the corrected Working Text from every to-fix thread and enters the
 * Diff Review. Dispatched from the Validate ribbon tab.
 */
export class ApplyFixCommand implements ICommand {
    readonly $type = Cmds.ApplyFixCommand;
}

/**
 * Prevent all actions to the editor (focus, quick actions, etc.)
 */
export class ToggleLockEditorCommand implements ICommand {
    readonly $type = Cmds.ToggleLockEditorCommand;

    constructor(public locked: boolean) {}
}

export class RestartTourCommand implements ICommand {
    readonly $type = Cmds.RestartTourCommand;
}

export class AddUserReviewCommand implements ICommand {
    readonly $type = Cmds.AddUserReviewCommand;

    constructor(public range: AdvisorRange) {}
}

export class AddThreadCommand implements IReversibleCommand {
    readonly $type = Cmds.AddThreadCommand;

    $undoCommand: ICommand | undefined;

    constructor(public thread: Omit<AdvisorThread, "id">) {}

    public setThread(thread: AdvisorThread) {
        this.$undoCommand = new RemoveThreadCommand(thread);
    }
}

/**
 * Remove a thread form the advisor revision.
 */
export class RemoveThreadCommand implements IReversibleCommand {
    readonly $type = Cmds.RemoveThreadCommand;

    $undoCommand: ICommand | undefined;

    constructor(public thread: AdvisorThread) {
        this.$undoCommand = new AddThreadCommand(thread);
    }
}

export class ChangeActiveThreadId implements ICommand {
    readonly $type = Cmds.ChangeActiveThreadId;

    constructor(public threadId: string | null) {}
}

/**
 * Sets the lifecycle status of an advisor thread (e.g. `to-fix` or `skip`).
 */
export class SetThreadStatusCommand implements ICommand {
    readonly $type = Cmds.SetThreadStatusCommand;

    constructor(
        public threadId: string,
        public status: AdvisorThreadStatus,
    ) {}
}

/**
 * Appends a user reply note to an existing advisor thread.
 */
export class AddThreadNoteCommand implements ICommand {
    readonly $type = Cmds.AddThreadNoteCommand;

    constructor(
        public threadId: string,
        public replyText: string,
    ) {}
}

/**
 * Replaces the text of an existing note within an advisor thread.
 */
export class ChangeThreadNoteCommand implements ICommand {
    readonly $type = Cmds.ChangeThreadNoteCommand;

    constructor(
        public threadId: string,
        public noteId: string,
        public newText: string,
    ) {}
}

/**
 * Removes a single note from an advisor thread.
 */
export class DeleteThreadNoteCommand implements ICommand {
    readonly $type = Cmds.DeleteThreadNoteCommand;

    constructor(
        public threadId: string,
        public noteId: string,
    ) {}
}

/**
 * Removes all advisor threads from the revision.
 */
export class ClearThreadsCommand implements ICommand {
    readonly $type = Cmds.ClearThreadsCommand;
}
