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
