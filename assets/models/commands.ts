import type { Range } from "@tiptap/vue-3";
import type { ICommand } from "#build/types/commands";
import type { CorrectedSentence, TextCorrectionBlock } from "./text-correction";

export const Cmds = {
    JumpToBlockCommand: "JumpToBlockCommand",
    ApplyCorrectionCommand: "ApplyCorrectionCommand",
    ApplyTextCommand: "ApplyTextCommand",
    RewriteTextCommand: "RewriteTextCommand",
    UndoCommand: "UndoCommand",
    RedoCommand: "RedoCommand",
    UndoRedoStateChanged: "UndoRedoStateChanged",
    CorrectedSentenceChangedCommand: "CorrectedSentenceChangedCommand",
    ToolSwitchCommand: "ToolSwitchCommand",
    SwitchCorrectionLanguageCommand: "SwitchCorrectionLanguageCommand",
    InvalidateCorrectionCommand: "InvalidateCorrectionCommand",
    RequestChangesCommand: "RequestChangesCommand",
    CompleteRequestChangeCommand: "CompleteRequestChangeCommand",
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

export class CorrectedSentenceChangedCommand implements ICommand {
    readonly $type = "CorrectedSentenceChangedCommand";
    constructor(
        public correctedSentence: CorrectedSentence,
        public change: "add" | "remove" | "update",
    ) {}
}

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

export class RequestChangesCommand implements ICommand {
    readonly $type = "RequestChangesCommand";

    constructor(
        public oldText: string,
        public newText: string,
        public from: number,
        public to: number,
    ) {}
}

export class CompleteRequestChangeCommand implements ICommand {
    readonly $type = "CompleteRequestChangeCommand";

    constructor(
        public requestCommand: RequestChangesCommand,
        public mode: "accept" | "reject",
    ) {}
}
