import type {
    TextCorrectionBlock,
    TextCorrectionResponse,
} from "../models/text-correction";

export class CorrectionService {
    private readonly blocks: TextCorrectionBlock[][] = [];
    private oldSentence: string[] = [];

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

    // This should only send the alterd sentences to the server
    // it should also update the position of the blocks when sentences before them are added, removed or edited
    // remove blocks from changed sentences and return them
    // afetwards make the api call to get the blocks of the altered senteces
    // then insert the new blocks into the blocks array

    async correctText(
        text: string,
        signal: AbortSignal,
        blocks: Ref<TextCorrectionBlock[]>,
    ): Promise<void> {
        try {
            blocks.value = await this.fetchBlocks(text, signal);

            // Replace the existing find logic with a more comprehensive comparison
            // that handles additions, removals, and modifications of sentences
            const sentences = text.split(/(?<=[.!?])\s/);

            // Store the changed sentence index and type of change
            let changedSentenceInfo: {
                index: number;
                type: "added" | "removed" | "modified" | null;
            } = {
                index: -1,
                type: null,
            };

            if (this.oldSentence.length !== sentences.length) {
                // First check if length is different (addition or removal)
                // Find first point of difference
                for (
                    let i = 0;
                    i < Math.min(this.oldSentence.length, sentences.length);
                    i++
                ) {
                    if (this.oldSentence[i] !== sentences[i]) {
                        changedSentenceInfo = {
                            index: i,
                            type:
                                sentences.length > this.oldSentence.length
                                    ? "added"
                                    : "removed",
                        };
                        break;
                    }
                }

                // If no difference found earlier, the change is at the end
                if (changedSentenceInfo.type === null) {
                    changedSentenceInfo = {
                        index: Math.min(
                            this.oldSentence.length,
                            sentences.length,
                        ),
                        type:
                            sentences.length > this.oldSentence.length
                                ? "added"
                                : "removed",
                    };
                }
            } else {
                // Lengths are the same, look for modifications
                for (let i = 0; i < sentences.length; i++) {
                    if (this.oldSentence[i] !== sentences[i]) {
                        changedSentenceInfo = {
                            index: i,
                            type: "modified",
                        };
                        break;
                    }
                }
            }

            // Update oldSentence reference for next comparison
            this.oldSentence = [...sentences];

            if (changedSentenceInfo.type) {
                // Log the change information for debugging
                console.log(
                    `Sentence change detected: ${changedSentenceInfo.type} at index ${changedSentenceInfo.index}`,
                );
                // Here you could add additional logic to handle the specific type of change
            }

            const newBlocks = this.fetchBlocks(text, signal);

            return;
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
