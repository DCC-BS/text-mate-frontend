import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";
import type { FixRequest } from "~/assets/models/advisor";

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
 * Simulates the fix LLM. The real backend rewrites the text from the per-thread
 * `source` + `proposal`/`reason` + notes context; those `proposal` values are
 * advisory instructions (e.g. "Formulieren Sie aktiv …"), NOT literal
 * replacements. Splicing them into the source position would produce nonsense,
 * so this dummy streams the text back unchanged. The diff viewer therefore
 * shows no changes — faithful rewiring requires the actual fix model.
 */
async function dummyFetcher(
    options: FetcherOptions<BodyType>,
): Promise<Response> {
    const stream = textDeltaStream(options.body.text);

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
        },
    });
}

/**
 * Splits the corrected text into word-sized deltas and enqueues each as a
 * raw UTF-8 chunk, then closes the stream. Mimics token streaming so the
 * client accumulate-on-completion path is exercised.
 */
function textDeltaStream(text: string): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const chunks = splitChunks(text);

    return new ReadableStream({
        async start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
                await delay(20);
            }
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
