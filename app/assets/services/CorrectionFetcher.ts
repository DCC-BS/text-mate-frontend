import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type {
    TextCorrectionBlock,
    TextCorrectionResponse,
} from "../models/text-correction";
import { UserDictionaryQuery } from "../queries/user_dictionary.query";

export interface ICorrectionFetcher {
    language: string;

    fetchBlocks(
        text: string,
        signal: AbortSignal,
    ): Promise<TextCorrectionBlock[]>;
}

export class CorrectionFetcher implements ICorrectionFetcher {
    static readonly $injectKey = "correctionFetcher";
    static readonly $inject = ["logger", UserDictionaryQuery];

    constructor(
        private readonly logger: BaseLogger,
        private readonly userDictionaryQuery: UserDictionaryQuery,
        public language: string,
    ) {}

    public async fetchBlocks(
        text: string,
        signal: AbortSignal,
    ): Promise<TextCorrectionBlock[]> {
        try {
            const response = await apiFetch<TextCorrectionResponse>(
                "/api/correct",
                {
                    body: { text: text, language: this.language },
                    method: "POST",
                    signal: signal,
                },
            );

            if (isApiError(response)) {
                if (response.errorId === "request_aborted") {
                    throw new Error("Request aborted", { cause: "aborted" });
                }

                throw response;
            }

            const blocks: TextCorrectionBlock[] = [];

            for (const block of response.blocks) {
                const inDict = await this.userDictionaryQuery.exists(
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
