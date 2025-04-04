import { diffArrays } from "diff";
import type {
    TextCorrectionBlock,
    TextCorrectionResponse,
} from "../models/text-correction";
import { Queue } from "./Queue";

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

    constructor(private readonly onError: (message: string) => void) {}

    private async fetchBlocks(
        text: string,
        signal: AbortSignal,
    ): Promise<TextCorrectionBlock[]> {
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
                throw new Error("Unknown error");
            }

            if ("cause" in e && e.cause === "aborted") {
                throw new Error("Request aborted", { cause: "aborted" });
            }

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
                    // If the sentence is unchanged, we can just yield it
                    const oldSentence = inputQueue.dequeue();
                    if (oldSentence) {
                        output.push({
                            ...oldSentence,
                            absoluteBlocks: moveBlocks(
                                currentPos,
                                oldSentence.relativeBlocks,
                            ),
                        });
                        currentPos += oldSentence.text.length;
                    }
                }
            }

            blocks.value = output.flatMap((s) => s.absoluteBlocks);
            this.oldSentence = output;
        } catch (e: unknown) {
            if (!(e instanceof Error)) {
                return;
            }

            if ("cause" in e && e.cause === "aborted") {
                return;
            }

            this.onError(e.message);
        }
    }
}
