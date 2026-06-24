import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";

type BodyType = { text: string; docs: string[] };

/**
 * Advisor v2 "check" endpoint.
 *
 * Streams rule violations (Server-Sent Events) for the submitted text. Unlike
 * the legacy `/advisor/validate` endpoint, every violation carries an explicit
 * character `range` so the frontend can anchor inline marks and comment cards
 * without re-scanning the text.
 *
 * See `docs/advisor-v2-backend.md` for the matching backend contract.
 */
export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>(async (event) => {
        const { text, docs } = await readBody(event);

        if (!text || !docs || !Array.isArray(docs) || docs.length > 5) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid input",
            });
        }

        return { text, docs };
    })
    .withRawFetcher()
    .withDummyFetcher(dummyFetcher)
    .build("/advisor/check");

// DUMMY

type AdvisorRange = { start: number; end: number };

type AdvisorCheckViolation = {
    range: AdvisorRange;
    rule_name: string;
    collection: string;
    reason: string;
    proposal: string;
    file_name: string;
    page_number: number;
};

type AdvisorCheckChunk = {
    violations: AdvisorCheckViolation[];
    checked?: number;
    total?: number;
};

/**
 * Sample violations modelled on the "Geschlechtergerechte Sprache" leitfaden,
 * matching the design prototype. Ranges are resolved against the submitted
 * text so the marks line up with whatever the user typed.
 */
const SAMPLE_DEFS = [
    {
        word: "Mitarbeiter",
        reason: "Die alleinige Verwendung der männlichen Form «Mitarbeiter» schliesst andere Geschlechter aus.",
        proposal:
            "Verwenden Sie eine Paarform: «Die Mitarbeiterin oder der Mitarbeiter».",
        page_number: 7,
    },
    {
        word: "Bürger",
        reason: "«Bürger» bezeichnet hier alle Personen und ist als generisches Maskulinum nicht zulässig.",
        proposal: "Nutzen Sie eine Paarform: «der Bürgerin oder dem Bürger».",
        page_number: 7,
    },
    {
        word: "Sachbearbeiter",
        reason: "«Sachbearbeiter» ist eine generisch maskuline Funktionsbezeichnung.",
        proposal:
            "Verwenden Sie eine neutrale Form: «die sachbearbeitende Person».",
        page_number: 9,
    },
    {
        word: "Antragsteller",
        reason: "«Antragsteller» schliesst nicht alle Geschlechter ein.",
        proposal: "Verwenden Sie «die antragstellende Person».",
        page_number: 11,
    },
];

const SAMPLE_COLLECTION = "Geschlechtergerechte Sprache";
const SAMPLE_FILE = "leitfaden_geschlechtergerechte_sprache_3aufl.pdf";

function buildSampleViolations(text: string): AdvisorCheckViolation[] {
    const out: AdvisorCheckViolation[] = [];

    for (const def of SAMPLE_DEFS) {
        const idx = text.indexOf(def.word);
        if (idx < 0) {
            continue;
        }

        out.push({
            range: { start: idx, end: idx + def.word.length },
            rule_name: "Verbot des generischen Maskulinums",
            collection: SAMPLE_COLLECTION,
            reason: def.reason,
            proposal: def.proposal,
            file_name: SAMPLE_FILE,
            page_number: def.page_number,
        });
    }

    return out.sort((a, b) => a.range.start - b.range.start);
}

function dummyFetcher(options: FetcherOptions<BodyType>) {
    const { text, docs } = options.body;

    const violations = docs.includes("beispiel-collection")
        ? buildSampleViolations(text)
        : [];

    // Emit one progress chunk per violation so the UI can show a live counter,
    // followed by a terminal chunk that marks the run complete.
    const total = Math.max(violations.length, 1);
    const chunks: AdvisorCheckChunk[] = violations.map((violation, index) => ({
        violations: [violation],
        checked: index + 1,
        total,
    }));

    chunks.push({ violations: [], checked: total, total });

    const stream = toStream(chunks);

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
