import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";
import type { FixRequest } from "~/assets/models/advisor";
import type { FixThread } from "~~/shared/types/advisor";

type BodyType = FixRequest;

export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>(async (event) => {
        const body = (await readBody(event)) as Partial<BodyType>;

        if (!body || typeof body.text !== "string") {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid input",
            });
        }

        const threads = Array.isArray(body.threads) ? body.threads : [];

        return { text: body.text, threads } satisfies BodyType;
    })
    .withRawFetcher()
    .withDummyFetcher(dummyFetcher)
    .build("/advisor/fix");

// DUMMY

/**
 * Simulates the fix LLM by substituting each to-fix thread's `source` with
 * its `proposal` (first occurrence), then streams the corrected text back
 * as SSE text-delta events terminated by `event: done`. Works on any text.
 */
async function dummyFetcher(
    options: FetcherOptions<BodyType>,
): Promise<Response> {
    const body = options.body;
    const corrected = applyProposals(body.text, body.threads);
    const stream = textDeltaStream(corrected);

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}

function applyProposals(text: string, threads: FixThread[]): string {
    let result = text;
    for (const thread of threads) {
        if (!thread.source || !thread.proposal) {
            continue;
        }
        // Replace only the first occurrence to keep the simulation stable.
        const idx = result.indexOf(thread.source);
        if (idx >= 0) {
            result =
                result.slice(0, idx) +
                thread.proposal +
                result.slice(idx + thread.source.length);
        }
    }
    return result;
}

/**
 * Splits the corrected text into word-sized deltas and emits each as an SSE
 * `data:` line, closing with `event: done`. Mimics token streaming so the
 * client accumulate-on-completion path is exercised.
 */
function textDeltaStream(text: string): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const chunks = splitChunks(text);

    return new ReadableStream({
        async start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(`data:${chunk}\n\n`));
                await delay(20);
            }
            controller.enqueue(encoder.encode("event:done\ndata:{}\n\n"));
            controller.close();
        },
    });
}

function splitChunks(text: string): string[] {
    if (text.length === 0) {
        return [];
    }
    // Stream ~3-word windows so progress is visible without thousands of
    // tiny frames on large documents.
    const words = text.split(/(\s+)/);
    const out: string[] = [];
    for (let i = 0; i < words.length; i += 6) {
        out.push(words.slice(i, i + 6).join(""));
    }
    return out;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
