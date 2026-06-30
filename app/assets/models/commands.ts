import type { Range } from "@tiptap/vue-3";
import type { ICommand, IReversibleCommand } from "#build/types/commands";
import type { TextTools } from "~/types/TextTools";
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
    ToolSwitchCommand: "ToolSwitchCommand",
    ToggleEditableEditorCommand: "ToggleEditableEditorCommand",
    ToggleLockEditorCommand: "ToggleLockEditorCommand",
    RegisterDiffCommand: "RegisterDiffCommand",
    RejectDiffCommand: "RejectDiffCommand",
    ExecuteTextActionCommand: "ExecuteTextActionCommand",
    RetryQuickActionCommand: "RetryQuickActionCommand",
    RunExampleQuickActionCommand: "RunExampleQuickActionCommand",
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
};

export class ClearTextCommand implements ICommand {
    readonly $type = "ClearTextCommand";
}

/**
 * Command that applies a text change to the text editor
 */
export class ApplyTextCommand implements ICommand {
    readonly $type = "ApplyTextCommand";

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
    readonly $type = "ApplyTextAtOffsetCommand";

    constructor(
        public text: string,
        public from: number,
        public to: number,
        public addToHistory = true,
    ) {}
}

export class RewriteTextCommand implements ICommand {
    readonly $type = "RewriteTextCommand";

    constructor(
        public text: string,
        public range: Range,
    ) {}
}

export class UndoCommand implements ICommand {
    readonly $type = "UndoCommand";
}

export class RedoCommand implements ICommand {
    readonly $type = "RedoCommand";
}

export class UndoRedoStateChanged implements ICommand {
    readonly $type = "UndoRedoStateChanged";

    constructor(
        public canUndo: boolean,
        public canRedo: boolean,
    ) {}
}

export class ToolSwitchCommand implements ICommand {
    readonly $type = "ToolSwitchCommand";

    constructor(public tool: TextTools) {}
}

export class ExecuteTextActionCommand implements ICommand {
    readonly $type = "ExecuteTextActionCommand";

    constructor(public stream: ReadableStream<Uint8Array<ArrayBufferLike>>) {}
}

/**
 * Re-runs the last quick action: rejects the current suggestion and applies the
 * same action to the original text again.
 */
export class RetryQuickActionCommand implements ICommand {
    readonly $type = "RetryQuickActionCommand";
}

/**
 * Runs an example quick action on the current editor text. Used by the onboarding
 * tour to populate the diff viewer with real content.
 */
export class RunExampleQuickActionCommand implements ICommand {
    readonly $type = "RunExampleQuickActionCommand";
}

export class ShowTextStatsCommand implements ICommand {
    readonly $type = "ShowTextStatsCommand";
}

export class HideTextStatsCommand implements ICommand {
    readonly $type = "HideTextStatsCommand";
}

/**
 * Command that applies a text change and can be undone/redone
 */
export class RegisterDiffCommand implements ICommand {
    readonly $type = "RegisterDiffCommand";

    constructor(
        public oldText: string,
        public newText: string,
    ) {}
}

/**
 * Rejects the currently pending diff suggestion, reverting the editor to the
 * original text. Used to trigger the reject flow from outside the diff viewer.
 */
export class RejectDiffCommand implements ICommand {
    readonly $type = "RejectDiffCommand";

    /** When false, the revert is not pushed onto the undo history. */
    constructor(public addToHistory = true) {}
}

/**
 * Prevent edits to the editor
 */
export class ToggleEditableEditorCommand implements ICommand {
    readonly $type = "ToggleEditableEditorCommand";

    constructor(public locked: boolean) {}
}

/**
 * Prevent all actions to the editor (focus, quick actions, etc.)
 */
export class ToggleLockEditorCommand implements ICommand {
    readonly $type = "ToggleLockEditorCommand";

    constructor(public locked: boolean) {}
}

export class RestartTourCommand implements ICommand {
    readonly $type = "RestartTourCommand";
}

export class AddUserReviewCommand implements ICommand {
    readonly $type = "AddUserReviewCommand";

    constructor(public range: AdvisorRange) {}
}

export class AddThreadCommand implements IReversibleCommand {
    readonly $type = "AddThreadCommand";

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
    readonly $type = "ChangeActiveThreadId";

    constructor(public threadId: string | null) {}
}

/**
 * Sets the lifecycle status of an advisor thread (e.g. `to-fix` or `skip`).
 */
export class SetThreadStatusCommand implements ICommand {
    readonly $type = "SetThreadStatusCommand";

    constructor(
        public threadId: string,
        public status: AdvisorThreadStatus,
    ) {}
}

/**
 * Appends a user reply note to an existing advisor thread.
 */
export class AddThreadNoteCommand implements ICommand {
    readonly $type = "AddThreadNoteCommand";

    constructor(
        public threadId: string,
        public replyText: string,
    ) {}
}

/**
 * Replaces the text of an existing note within an advisor thread.
 */
export class ChangeThreadNoteCommand implements ICommand {
    readonly $type = "ChangeThreadNoteCommand";

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
    readonly $type = "DeleteThreadNoteCommand";

    constructor(
        public threadId: string,
        public noteId: string,
    ) {}
}
