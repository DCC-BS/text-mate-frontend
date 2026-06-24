import { apiStreamFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type { AdvisorCheckChunk, AdvisorFixThread } from "~/types/advisorV2";

/**
 * Streaming client for the Advisor v2 endpoints.
 *
 * - `check` streams rule violations (with text ranges) as JSON SSE blocks.
 * - `fix` streams the fully corrected text as raw text chunks.
 *
 * The service is intentionally stateless; the document catalogue is still
 * served by {@link AdvisorService} and reused by the v2 UI.
 */
export class AdvisorV2Service {
    static readonly $injectKey = "advisorV2Service";
    static readonly $inject = [];

    /**
     * Streams check results. Each SSE `data:` block is parsed into an
     * {@link AdvisorCheckChunk}.
     */
    async *check(
        text: string,
        docs: string[],
        signal?: AbortSignal,
    ): AsyncGenerator<AdvisorCheckChunk, void, void> {
        const response = await apiStreamFetch("api/advisor-v2/check", {
            method: "POST",
            body: { text, docs },
            signal,
        });

        if (isApiError(response)) {
            throw response;
        }

        yield* this.readSse(response, (raw) => {
            const parsed = JSON.parse(raw) as AdvisorCheckChunk;
            parsed.violations ??= [];
            return parsed;
        });
    }

    /**
     * Streams the corrected full text. Yields incremental text chunks; the
     * caller concatenates them to obtain the final corrected document.
     */
    async *fix(
        text: string,
        threads: AdvisorFixThread[],
        signal?: AbortSignal,
    ): AsyncGenerator<string, void, void> {
        const response = await apiStreamFetch("api/advisor-v2/fix", {
            method: "POST",
            body: { text, threads },
            signal,
        });

        if (isApiError(response)) {
            throw response;
        }

        const reader = response.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }
                yield decoder.decode(value, { stream: true });
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Reads a `text/event-stream` body, splitting on blank lines and parsing
     * each `data:` payload with the supplied mapper.
     */
    private async *readSse<T>(
        response: ReadableStream<Uint8Array>,
        parse: (raw: string) => T,
    ): AsyncGenerator<T, void, void> {
        const reader = response.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                let separatorIndex = buffer.indexOf("\n\n");
                while (separatorIndex !== -1) {
                    const block = buffer.slice(0, separatorIndex);
                    buffer = buffer.slice(separatorIndex + 2);

                    const payload = this.parseBlock(block, parse);
                    if (payload !== undefined) {
                        yield payload;
                    }

                    separatorIndex = buffer.indexOf("\n\n");
                }
            }

            if (buffer.trim().length > 0) {
                const payload = this.parseBlock(buffer, parse);
                if (payload !== undefined) {
                    yield payload;
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    private parseBlock<T>(
        block: string,
        parse: (raw: string) => T,
    ): T | undefined {
        const lines = block.replaceAll("\r", "").split("\n");

        for (const line of lines) {
            if (!line.startsWith("data:")) {
                continue;
            }

            const raw = line.slice(5).trim();
            if (!raw) {
                continue;
            }

            try {
                return parse(raw);
            } catch {
                return undefined;
            }
        }

        return undefined;
    }
}
