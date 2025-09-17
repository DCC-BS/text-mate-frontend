import type { ILogger } from "@dcc-bs/logger.bs.js";
import { diffArrays } from "diff";
import type { ChangeObject } from "diff/lib/types.js";
import type { ICommand } from "#build/types/commands";
import { ApiError } from "../../utils/apiFetch";
import { CorrectionBlockChangedCommand } from "../models/commands";
import type { TextCorrectionBlock } from "../models/text-correction";
import {
    CorrectionFetcher,
    type ICorrectionFetcher,
} from "./CorrectionFetcher";
import { Queue } from "./Queue";
import { splitToSentences } from "./string-parser";

type ArrayChange<T> = ChangeObject<T[]>;

export class CorrectionService {
    static readonly $injectKey = "correctionService";
    static readonly $inject = [
        "logger",
        CorrectionFetcher,
        "executeCommand",
        "translate",
    ];

    private lastSentences: string[] = [];
    private lastBlocks: TextCorrectionBlock[] = [];
    private correction_lock = false;

    constructor(
        private readonly logger: ILogger,
        private readonly correctionFetcher: ICorrectionFetcher,
        private readonly executeCommand: (command: ICommand) => Promise<void>,
        private readonly t: (key: string) => string,
        private readonly onError: (message: string) => void,
        private language = "auto",
    ) {}

    async invalidateAll(): Promise<void> {
        await this.lock();
        try {
            for (const blocks of this.lastBlocks) {
                const command = new CorrectionBlockChangedCommand(
                    blocks,
                    "remove",
                );
                await this.executeCommand(command);
            }

            this.lastSentences = [];
            this.lastBlocks = [];
        } finally {
            this.unlock();
        }
    }

    /**
     * Corrects the given text by fetching blocks of corrections and updating the
     * provided blocks reference.
     *
     * @param {string} text - The text to correct.
     * @param {AbortSignal} signal - The abort signal to cancel the request.
     * @param {Ref<TextCorrectionBlock[]>} blocks - The reference to update with
     * @param {boolean} invalidateAll - If true, all blocks will be invalidated.
     * corrected blocks.
     */
    async correctText(text: string, signal: AbortSignal): Promise<void> {
        await this.lock();

        try {
            const sentences = Array.from(splitToSentences(text));
            const diff = this.getDiff(sentences);

            // process the diffs this can be canceld with the signal
            const { blocks, commands } = await this.processDiff(diff, signal);

            // update the cache of last processd sentences and blocks
            this.lastSentences = sentences;
            this.lastBlocks = blocks;

            // execute all the commands
            for (const command of commands) {
                try {
                    await this.executeCommand(command);
                } catch (e: unknown) {
                    if (!(e instanceof Error)) {
                        this.logger.error(
                            "Unknown error during text correction",
                        );
                    } else {
                        this.logger.error(
                            `Error during text correction: ${e.message}`,
                        );
                    }
                }
            }
        } catch (e: unknown) {
            if (e instanceof ApiError) {
                this.onError(this.t(`errors.${e.errorId}`));
                return;
            }

            if (!(e instanceof Error)) {
                this.logger.error("Unknown error during text correction");
                return;
            }

            if ("cause" in e && e.cause === "aborted") {
                this.logger.debug("Text correction aborted due to signal");
                return;
            }

            this.logger.error(`Error during text correction: ${e.message}`);
            this.onError(e.message);
        } finally {
            this.unlock();
        }
    }

    public async switchLanguage(language: string): Promise<void> {
        if (this.language === language) {
            return;
        }

        this.correctionFetcher.language = language;
        this.invalidateAll();
    }

    /**
     * Compares the old sentences with the new text and returns the differences.
     *
     * @param {string[]} sentences - The new text split into sentences.
     * @returns {ArrayChange<string>[]} - An array of change parts where each part contains:
     *   - value: Array of sentences within this change part
     *   - added: True if these sentences were added in the new text
     *   - removed: True if these sentences were removed from the old text
     *   - When both added and removed are false, it means the sentences are unchanged
     *   - count: Number of sentences in this change part
     */
    private getDiff(sentences: string[]): ArrayChange<string>[] {
        return diffArrays(this.lastSentences, sentences);
    }

    /**
     * Processes the diff and updates the blocks accordingly.
     * It fetches new blocks for added sentences and removes blocks for removed sentences.
     * It also updates the position of blocks for unchanged sentences if needed.
     * If the signal is aborted, it throws an error.
     * It also returns commands for adding, removing, or updating blocks.
     *
     * @returns {{blocks: TextCorrectionBlock[], commands: CorrectionBlockChangedCommand[]}} - new blocks and commands to execute
     */
    private async processDiff(
        diff: ArrayChange<string>[],
        signal: AbortSignal,
    ): Promise<{
        blocks: TextCorrectionBlock[];
        commands: CorrectionBlockChangedCommand[];
    }> {
        const oldBlocks = new Queue(this.lastBlocks);
        const newBlocks = [] as TextCorrectionBlock[];
        // const newSegments = [] as CorrectedSegments[];
        const commands = [] as CorrectionBlockChangedCommand[];
        let hasChanges = false;

        // text editor is 1 based, so we start at 1
        let oldPointer = 1;
        let newPointer = 1;

        for (const part of diff) {
            if (signal.aborted) {
                throw new Error("Request aborted", { cause: "aborted" });
            }

            const newText = part.value.join("");
            const oldTo = oldPointer + newText.length;

            if (part.removed) {
                while (
                    oldBlocks.size() > 0 &&
                    oldBlocks.safePeek().offset < oldTo
                ) {
                    commands.push(
                        new CorrectionBlockChangedCommand(
                            oldBlocks.safeDequeue(),
                            "remove",
                        ),
                    );
                }

                hasChanges = true;
            } else if (part.added) {
                const fetchedBlocks = await this.correctionFetcher.fetchBlocks(
                    newText,
                    signal,
                );

                for (const block of fetchedBlocks) {
                    const absoluteBlock = {
                        ...block,
                        offset: block.offset + newPointer,
                    };

                    newBlocks.push(absoluteBlock);

                    commands.push(
                        new CorrectionBlockChangedCommand(absoluteBlock, "add"),
                    );
                }

                hasChanges = true;
            } else {
                if (!hasChanges) {
                    while (
                        oldBlocks.size() > 0 &&
                        oldBlocks.safePeek().offset < oldTo
                    ) {
                        newBlocks.push(oldBlocks.safeDequeue());
                    }
                } else {
                    // if there are changes, we need to update the blocks
                    while (
                        oldBlocks.size() > 0 &&
                        oldBlocks.safePeek().offset < oldTo
                    ) {
                        const block = oldBlocks.safeDequeue();
                        const difference = newPointer - oldPointer;
                        const newBlock = {
                            ...block,
                            offset: block.offset + difference,
                        };

                        const newCommand = new CorrectionBlockChangedCommand(
                            newBlock,
                            "update",
                        );

                        newBlocks.push(newBlock);
                        commands.push(newCommand);
                    }
                }
            }

            // advance the pointers

            if (part.removed) {
                // when a sentence was removed, we andvance the old pointer, new pointer stays the same
                oldPointer += newText.length;
            } else if (part.added) {
                // when a sentence was added, we andvance the new pointer, old pointer stays the same
                newPointer += newText.length;
            } else {
                // when a sentence was unchanged, we andvance both pointers
                oldPointer += newText.length;
                newPointer += newText.length;
            }
        }

        return { blocks: newBlocks, commands };
    }

    private async lock() {
        const now = Date.now();

        while (this.correction_lock) {
            if (Date.now() - now > 5000) {
                this.logger.warn("Lock timeout exceeded, forcing unlock");
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        this.correction_lock = true;
    }

    private unlock() {
        this.correction_lock = false;
    }
}
