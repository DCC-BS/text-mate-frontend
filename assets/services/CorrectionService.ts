import type { ILogger } from "@dcc-bs/logger.bs.js";
import { type ArrayChange, diffArrays } from "diff";
import type { ICommand } from "#build/types/commands";
import { CorrectedSentenceChangedCommand } from "../models/commands";
import type {
    CorrectedSentence,
    TextCorrectionBlock,
    TextCorrectionResponse,
} from "../models/text-correction";
import { Queue } from "./Queue";
import { splitToSentences } from "./string-parser";

export class CorrectionService {
    private oldSentences: CorrectedSentence[] = [];
    private correction_lock = false;

    constructor(
        private readonly logger: ILogger,
        private readonly executeCommand: (command: ICommand) => Promise<void>,
        private readonly wordInUserDictionary: (
            word: string,
        ) => Promise<boolean>,
        private readonly onError: (message: string) => void,
        private language = "auto",
    ) {}

    async invalidateAll(): Promise<void> {
        for (const sentence of this.oldSentences) {
            const command = new CorrectedSentenceChangedCommand(
                sentence,
                "remove",
            );
            await this.executeCommand(command);
        }

        this.oldSentences = [];
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

            this.oldSentences = sentences;

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

        this.language = language;
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

        let diff: ArrayChange<string>[] = [];
        diff = diffArrays(
            this.oldSentences.map((s) => s.text),
            sentences,
        );

        return diff;
    }

    private async processDiff(
        diff: ArrayChange<string>[],
        signal: AbortSignal,
    ): Promise<{
        sentences: CorrectedSentence[];
        commands: CorrectedSentenceChangedCommand[];
    }> {
        const inputQueue = new Queue(this.oldSentences);
        const newSentences = [] as CorrectedSentence[];
        const commands = [] as CorrectedSentenceChangedCommand[];
        let currentPos = 0;
        let hasChanges = false;

        for (const part of diff) {
            if (signal.aborted) {
                throw new Error("Request aborted", { cause: "aborted" });
            }

            if (part.removed) {
                for (let i = 0; part.value.length > i; i++) {
                    const oldSentence = inputQueue.dequeue();

                    if (oldSentence) {
                        commands.push(
                            new CorrectedSentenceChangedCommand(
                                {
                                    ...oldSentence,
                                    from: currentPos + oldSentence.from,
                                    to: currentPos + oldSentence.to,
                                },
                                "remove",
                            ),
                        );
                    } else {
                        this.logger.error(
                            "No sentence found in input queue to remove",
                        );
                    }

                    hasChanges = true;
                }
            } else if (part.added) {
                for (const sentence of part.value) {
                    const command = await this.addCorrectedSentences(
                        sentence,
                        signal,
                        currentPos,
                    );

                    if (!command) {
                        continue;
                    }

                    newSentences.push(command.correctedSentence);
                    commands.push(command);
                    hasChanges = true;

                    currentPos += sentence.length;
                }
            } else {
                for (const sentence of part.value) {
                    const oldSentence = inputQueue.dequeue();

                    if (oldSentence?.text !== sentence) {
                        this.logger.error(
                            `Old sentence "${oldSentence?.text}" does not match new sentence "${sentence}"`,
                        );
                    }

                    if (oldSentence) {
                        const newSentence = {
                            ...oldSentence,
                            from: currentPos,
                            to: currentPos + sentence.length,
                        };

                        newSentences.push(newSentence);

                        if (hasChanges) {
                            commands.push(
                                new CorrectedSentenceChangedCommand(
                                    newSentence,
                                    "update",
                                ),
                            );
                        }
                    }

                    currentPos += sentence.length;
                }
            }
        }

        return { sentences: newSentences, commands };
    }

    private async addCorrectedSentences(
        sentence: string,
        signal: AbortSignal,
        startPos: number,
    ): Promise<CorrectedSentenceChangedCommand | undefined> {
        try {
            const newBlocks = await this.fetchBlocks(sentence, signal);

            const newSentence = {
                id: crypto.randomUUID(),
                text: sentence,
                from: startPos,
                to: startPos + sentence.length,
                blocks: newBlocks,
            } as CorrectedSentence;

            return new CorrectedSentenceChangedCommand(newSentence, "add");
        } catch (e: unknown) {
            if (!(e instanceof Error)) {
                this.logger.error("Unknown error during text correction");
                return undefined;
            }

            if ("cause" in e && e.cause === "aborted") {
                this.logger.debug("Text correction aborted due to signal");
                return undefined;
            }

            this.logger.error(`Error during text correction: ${e.message}`);
            this.onError(e.message);
        }
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

    private async fetchBlocks(
        text: string,
        signal: AbortSignal,
    ): Promise<TextCorrectionBlock[]> {
        try {
            const response = await $fetch<TextCorrectionResponse>(
                "/api/correct",
                {
                    body: { text: text, language: this.language },
                    method: "POST",
                    signal: signal,
                },
            );

            const blocks: TextCorrectionBlock[] = [];

            for (const block of response.blocks) {
                console.log(block.original);

                const inDict = await this.wordInUserDictionary(
                    block.original.trim(),
                );
                if (!inDict) {
                    blocks.push({ ...block, id: crypto.randomUUID() });
                }
            }

            return blocks;
        } catch (e: unknown) {
            if (!(e instanceof Error)) {
                this.logger.error("Unknown error in fetchBlocks");
                throw new Error("Unknown error");
            }

            if ("cause" in e && e.cause === "aborted") {
                throw new Error("Request aborted", { cause: "aborted" });
            }

            this.logger.error(
                `Error fetching blocks: ${e instanceof Error ? e.message : "Unknown error"}`,
            );
            throw e;
        }
    }
}
