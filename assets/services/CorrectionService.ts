import { diffArrays } from "diff";
import type {
    TextCorrectionBlock,
    TextCorrectionResponse,
} from "../models/text-correction";
import { Queue } from "./Queue";
import type { ILogger } from "@dcc-bs/logger.bs.js";

type CorrectedSentence = {
    text: string;
    start: number;
    end: number;
    relativeBlocks: TextCorrectionBlock[];
    absoluteBlocks: TextCorrectionBlock[];
};

function moveBlocks(offset: number, blocks: TextCorrectionBlock[]) {
    return blocks.map((block) => ({
        ...block,
        offset: block.offset + offset,
    }));
}

export class CorrectionService {
    private readonly blocks: TextCorrectionBlock[][] = [];
    private oldSentence: CorrectedSentence[] = [];

    constructor(
        private readonly logger: ILogger,
        private readonly onError: (message: string) => void,
    ) {}

    private async fetchBlocks(
        text: string,
        signal: AbortSignal,
    ): Promise<TextCorrectionBlock[]> {
        this.logger.info(
            `Fetching correction blocks for text of length: ${text.length}`,
        );
        try {
            const response = await $fetch<TextCorrectionResponse>(
                "/api/correct",
                {
                    body: { text: text },
                    method: "POST",
                    signal: signal,
                },
            );

            return response.blocks;
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
     * corrected blocks.
     */
    async correctText(
        text: string,
        signal: AbortSignal,
        blocks: Ref<TextCorrectionBlock[]>,
    ): Promise<void> {
        try {
            const segmenter = new Intl.Segmenter("de", {
                granularity: "sentence",
            });

            const sentences = Array.from(segmenter.segment(text)).map(
                (s) => s.segment,
            );

            const diff = diffArrays(
                this.oldSentence.map((s) => s.text),
                sentences,
            );

            const inputQueue = new Queue(this.oldSentence);
            const output: CorrectedSentence[] = [];
            let currentPos = 0;

            for (const part of diff) {
                if (signal.aborted) {
                    return;
                }

                if (part.removed) {
                    for (let i = 0; part.value.length > i; i++) {
                        inputQueue.dequeue();
                    }
                } else if (part.added) {
                    const newSentences = part.value;

                    for (const sentence of newSentences) {
                        const newBlocks = await this.fetchBlocks(
                            sentence,
                            signal,
                        );

                        output.push({
                            text: sentence,
                            start: currentPos,
                            end: currentPos + sentence.length,
                            relativeBlocks: newBlocks,
                            absoluteBlocks: moveBlocks(currentPos, newBlocks),
                        });

                        currentPos += sentence.length;
                    }
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
                            output.push({
                                ...oldSentence,
                                absoluteBlocks: moveBlocks(
                                    currentPos,
                                    oldSentence.relativeBlocks,
                                ),
                            });
                            currentPos += sentence.length;
                        }
                    }
                }
            }

            blocks.value = output.flatMap((s) => s.absoluteBlocks);
            this.oldSentence = output;
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
}
