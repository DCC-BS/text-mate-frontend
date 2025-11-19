import type { Range } from "@tiptap/vue-3";
import type { ICommand } from "#build/types/commands";
import type { TextCorrectionBlock } from "./text-correction";

export const Cmds = {
    JumpToBlockCommand: "JumpToBlockCommand",
    ApplyCorrectionCommand: "ApplyCorrectionCommand",
    ApplyTextCommand: "ApplyTextCommand",
    RewriteTextCommand: "RewriteTextCommand",
    UndoCommand: "UndoCommand",
    RedoCommand: "RedoCommand",
    UndoRedoStateChanged: "UndoRedoStateChanged",
    ToolSwitchCommand: "ToolSwitchCommand",
    SwitchCorrectionLanguageCommand: "SwitchCorrectionLanguageCommand",
    InvalidateCorrectionCommand: "InvalidateCorrectionCommand",
    ToggleEditableEditorCommand: "ToggleEditableEditorCommand",
    CorrectionBlockChangedCommand: "CorrectionBlockChangedCommand",
    ToggleLockEditorCommand: "ToggleLockEditorCommand",
    RegisterDiffCommand: "RegisterDiffCommand",
    ExecuteTextActionCommand: "ExecuteTextActionCommand",
    RestartTourCommand: "RestartTourCommand",
    ClearTextCommand: "ClearTextCommand",
    ShowTextStatsCommand: "ShowTextStatsCommand",
    HideTextStatsCommand: "HideTextStatsCommand",
};

export class JumpToBlockCommand implements ICommand {
    readonly $type = "JumpToBlockCommand";

    constructor(public block: TextCorrectionBlock) {}
}

export class ApplyCorrectionCommand implements ICommand {
    readonly $type = "ApplyCorrectionCommand";

    constructor(
        public block: TextCorrectionBlock,
        public corrected: string,
    ) {}
}

export class ClearTextCommand implements ICommand {
    readonly $type = "ClearTextCommand";
}

export class CorrectionBlockChangedCommand implements ICommand {
    readonly $type = "CorrectionBlockChangedCommand";

    constructor(
        public block: TextCorrectionBlock,
        public change: "add" | "remove" | "update",
    ) {}
}

/**
 * Command that applies a text change to the text editor
 */
export class ApplyTextCommand implements ICommand {
    readonly $type = "ApplyTextCommand";

    constructor(
        public text: string,
        public range: Range,
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

    constructor(public tool: "correction" | "rewrite" | "advisor") {}
}

export class SwitchCorrectionLanguageCommand implements ICommand {
    readonly $type = "SwitchCorrectionLanguageCommand";

    constructor(public language: string) {}
}

export class InvalidateCorrectionCommand implements ICommand {
    readonly $type = "InvalidateCorrectionCommand";
}

export class ExecuteTextActionCommand implements ICommand {
    readonly $type = "ExecuteTextActionCommand";

    constructor(public stream: ReadableStream<Uint8Array<ArrayBufferLike>>) {}
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
