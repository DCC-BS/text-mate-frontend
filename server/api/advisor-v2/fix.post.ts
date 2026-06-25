import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";
import type { AdvisorFixThread } from "#shared/advisorV2";

type BodyType = { text: string; threads: AdvisorFixThread[] };

/**
 * Advisor v2 "fix" endpoint.
 *
 * Receives the full text plus the threads the user marked as "to-fix" and
 * streams back the fully corrected text (the model rewrites the document in a
 * single pass — the frontend never splices offsets itself). The corrected text
 * is streamed as raw text chunks.
 *
 * See `docs/advisor-v2-backend.md` for the matching backend contract.
 */
export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>(async (event) => {
        const { text, threads } = await readBody(event);

        if (!text || !Array.isArray(threads)) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid input",
            });
        }

        return { text, threads };
    })
    .withRawFetcher()
    .withDummyFetcher(dummyFetcher)
    .build("/advisor/fix");

// DUMMY

/**
 * Maps a violation word to the phrase that should be rewritten and its
 * gender-inclusive replacement, mirroring the design prototype.
 */
const WORD_FIXES: Record<string, [find: string, replace: string]> = {
    Mitarbeiter: ["Der Mitarbeiter", "Die Mitarbeiterin oder der Mitarbeiter"],
    Bürger: ["dem Bürger", "der Bürgerin oder dem Bürger"],
    Sachbearbeiter: ["der Sachbearbeiter", "die sachbearbeitende Person"],
    Antragsteller: ["den Antragsteller", "die antragstellende Person"],
};

function applyFixes(text: string, threads: AdvisorFixThread[]): string {
    let corrected = text;

    for (const thread of threads) {
        for (const [word, [find, replace]] of Object.entries(WORD_FIXES)) {
            if (thread.snippet.includes(word)) {
                corrected = corrected.replace(find, replace);
            }
        }
    }

    return corrected;
}

function dummyFetcher(options: FetcherOptions<BodyType>) {
    const { text, threads } = options.body;
    const corrected = applyFixes(text, threads);

    // Stream the corrected text token by token to exercise the streaming path.
    const tokens = corrected.split(/(\s+)/);

    const stream = new ReadableStream({
        async start(controller) {
            try {
                for (const token of tokens) {
                    controller.enqueue(new TextEncoder().encode(token));
                    await new Promise((resolve) => setTimeout(resolve, 40));
                }
                controller.close();
            } catch (error) {
                controller.error(error);
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
