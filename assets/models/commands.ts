import type { TextCorrectionBlock } from "./text-correction";
import type { Range } from "@tiptap/vue-3";
import type { ICommand } from "#build/types/commands";

export const Cmds = {
    JumpToBlockCommand: "JumpToBlockCommand",
    ApplyCorrectionCommand: "ApplyCorrectionCommand",
    ApplyTextCommand: "ApplyTextCommand",
    RewriteTextCommand: "RewriteTextCommand",
}


export class JumpToBlockCommand implements ICommand {
    readonly $type = "JumpToBlockCommand";

    constructor(
        public block: TextCorrectionBlock) {
    }
}

export class ApplyCorrectionCommand implements ICommand {
    readonly $type = "ApplyCorrectionCommand";

    constructor(
        public block: TextCorrectionBlock,
        public corrected: string) {
    }
}

export class ApplyTextCommand implements ICommand {
    readonly $type = "ApplyTextCommand";

    constructor(
        public text: string,
        public range: Range) {
    }
}

export class RewriteTextCommand implements ICommand {
    readonly $type = "RewriteTextCommand";

    constructor(
        public text: string,
        public range: Range) {
    }
}
