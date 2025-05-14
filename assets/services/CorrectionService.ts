import type { ILogger } from "@dcc-bs/logger.bs.js";
import { type ArrayChange, diffArrays } from "diff";
import type { ICommand } from "#build/types/commands";
import { CorrectionBlockChangedCommand } from "../models/commands";
import type { CorrectedSegments } from "../models/text-correction";
import type { ICorrectionFetcher } from "./CorrectionFetcher";
import { Queue } from "./Queue";
import { splitToSentences } from "./string-parser";

export class CorrectionService {
    private oldSegments: CorrectedSegments[] = [];
    private correction_lock = false;

    constructor(
        private readonly logger: ILogger,
        private readonly executeCommand: (command: ICommand) => Promise<void>,
        private readonly correctionFetcher: ICorrectionFetcher,
        private readonly onError: (message: string) => void,
        private language = "auto",
    ) {}

    async invalidateAll(): Promise<void> {
        for (const blocks of this.getAbsoulteBlocks()) {
            const command = new CorrectionBlockChangedCommand(blocks, "remove");
            await this.executeCommand(command);
        }

        this.oldSegments = [];
    }

    private getAbsoulteBlocks() {
        return this.oldSegments.flatMap((s) =>
            s.blocks.map((b) => ({
                ...b,
                offset: b.offset + s.from,
            })),
        );
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
            const diff = this.getDiff(text);

            const { sentences, commands } = await this.processDiff(
                diff,
                signal,
            );

            this.oldSegments = sentences;

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
     * @param {string} text - The new text to compare against.
     * @param {boolean} invalidateAll - If true, all sentences will be invalidated.
     * @returns {ArrayChange<string>[]} - An array of change parts where each part contains:
     *   - value: Array of sentences within this change part
     *   - added: True if these sentences were added in the new text
     *   - removed: True if these sentences were removed from the old text
     *   - When both added and removed are false, it means the sentences are unchanged
     *   - count: Number of sentences in this change part
     */
    private getDiff(text: string): ArrayChange<string>[] {
        const sentences = Array.from(splitToSentences(text));
        const oldSentences = Array.from(
            splitToSentences(this.oldSegments.map((s) => s.text).join("")),
        );

        let diff: ArrayChange<string>[] = [];
        diff = diffArrays(oldSentences, sentences);

        return diff;
    }

    private async processDiff(
        diff: ArrayChange<string>[],
        signal: AbortSignal,
    ): Promise<{
        sentences: CorrectedSegments[];
        commands: CorrectionBlockChangedCommand[];
    }> {
        const oldBlocks = new Queue(this.getAbsoulteBlocks());
        const newSegments = [] as CorrectedSegments[];
        const commands = [] as CorrectionBlockChangedCommand[];
        let hasChanges = false;

        let oldPointer = 0;
        let newPointer = 0;

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
                const newBlocks = await this.correctionFetcher.fetchBlocks(
                    newText,
                    signal,
                );

                const newSegment = {
                    id: crypto.randomUUID(),
                    text: newText,
                    from: newPointer,
                    to: newPointer + newText.length,
                    blocks: newBlocks,
                };

                newSegments.push(newSegment);

                for (const block of newBlocks) {
                    const absoluteBlock = {
                        ...block,
                        offset: block.offset + newPointer + 1,
                    };

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
                        oldBlocks.safeDequeue();
                    }
                } else {
                    // if there are changes, we need to update the blocks
                    while (
                        oldBlocks.size() > 0 &&
                        oldBlocks.safePeek().offset < oldTo
                    ) {
                        const block = oldBlocks.safeDequeue();
                        const difference = newPointer - oldPointer;
                        commands.push(
                            new CorrectionBlockChangedCommand(
                                {
                                    ...block,
                                    offset: block.offset + difference + 1,
                                },
                                "update",
                            ),
                        );
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

        return { sentences: newSegments, commands };
    }

    private async lock() {
        while (this.correction_lock) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        this.correction_lock = true;
    }

    private unlock() {
        this.correction_lock = false;
    }
}
