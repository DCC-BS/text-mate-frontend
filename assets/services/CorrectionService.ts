import { diffArrays, type ArrayChange } from "diff";
import type {
    CorrectedSentence,
    TextCorrectionBlock,
    TextCorrectionResponse,
} from "../models/text-correction";
import { Queue } from "./Queue";
import type { ILogger } from "@dcc-bs/logger.bs.js";
import type { ICommand } from "#build/types/commands";
import { CorrectedSentenceChangedCommand } from "../models/commands";

function moveBlocks(offset: number, blocks: TextCorrectionBlock[]) {
    return blocks.map((block) => ({
        ...block,
        offset: block.offset + offset,
    }));
}

export function makeCorrectedSentenceAbsolute(sentence: CorrectedSentence) {
    return {
        ...sentence,
        blocks: moveBlocks(sentence.from, sentence.blocks),
    };
}

export class CorrectionService {
    private readonly blocks: TextCorrectionBlock[][] = [];
    private oldSentences: CorrectedSentence[] = [];

    constructor(
        private readonly logger: ILogger,
        private readonly executeCommand: (command: ICommand) => Promise<void>,
        private readonly wordInUserDictionary: (
            word: string,
        ) => Promise<boolean>,
        private readonly onError: (message: string) => void,
        private language = "auto",
    ) {}

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

            const blocks = [];

            for (const block of response.blocks) {
                const inDict = await this.wordInUserDictionary(block.original);
                if (!inDict) {
                    blocks.push(block);
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
    async correctText(
        text: string,
        signal: AbortSignal,
        invalidateAll: boolean,
    ): Promise<void> {
        try {
            const segmenter = new Intl.Segmenter("de", {
                granularity: "sentence",
            });

            const sentences = Array.from(segmenter.segment(text)).map(
                (s) => s.segment,
            );

            let diff: ArrayChange<string>[] = [];

            if (invalidateAll) {
                const removed = this.oldSentences.map((s) => s.text);

                diff = [
                    {
                        value: removed,
                        added: false,
                        removed: true,
                        count: removed.length,
                    },
                    {
                        value: sentences,
                        added: true,
                        removed: false,
                        count: sentences.length,
                    },
                ];
            } else {
                diff = diffArrays(
                    this.oldSentences.map((s) => s.text),
                    sentences,
                );
            }

            const inputQueue = new Queue(this.oldSentences);
            this.oldSentences = [];
            let currentPos = 0;
            let hasChanges = false;

            for (const part of diff) {
                if (signal.aborted) {
                    while (inputQueue.size() > 0) {
                        const sentence = inputQueue.dequeue();
                        if (sentence) {
                            this.oldSentences.push(sentence);
                        }
                    }

                    return;
                }

                if (part.removed) {
                    for (let i = 0; part.value.length > i; i++) {
                        const oldSentence = inputQueue.dequeue();

                        if (oldSentence) {
                            this.executeCommand(
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
                    const newSentences = await this.addCorrectedSentences(
                        part,
                        signal,
                        currentPos,
                    );
                    this.oldSentences.push(...newSentences);
                    hasChanges = true;

                    currentPos += part.value.reduce(
                        (acc, sentence) => acc + sentence.length,
                        0,
                    );
                } else {
                    for (const sentence of part.value) {
                        // If the sentence is unchanged, we can just yield it
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
                            this.oldSentences.push(newSentence);

                            if (hasChanges) {
                                this.executeCommand(
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
        }
    }

    public async switchLanguage(language: string): Promise<void> {
        if (this.language === language) {
            return;
        }

        this.language = language;
    }

    private async addCorrectedSentences(
        part: ArrayChange<string>,
        signal: AbortSignal,
        startPos: number,
    ): Promise<CorrectedSentence[]> {
        const result = [] as CorrectedSentence[];

        try {
            const newSentences = part.value;
            let currentPos = startPos;

            for (const sentence of newSentences) {
                const newBlocks = await this.fetchBlocks(sentence, signal);

                const newSentence = {
                    id: crypto.randomUUID(),
                    text: sentence,
                    from: currentPos,
                    to: currentPos + sentence.length,
                    blocks: newBlocks,
                };

                result.push(newSentence);

                this.executeCommand(
                    new CorrectedSentenceChangedCommand(newSentence, "add"),
                );

                currentPos += sentence.length;
            }
        } catch (e: unknown) {
            if (!(e instanceof Error)) {
                this.logger.error("Unknown error during text correction");
                return [];
            }

            if ("cause" in e && e.cause === "aborted") {
                this.logger.debug("Text correction aborted due to signal");
                return [];
            }

            this.logger.error(`Error during text correction: ${e.message}`);
            this.onError(e.message);
        }

        return result;
    }
}
