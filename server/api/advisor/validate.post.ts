import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";

type BodyType = { text: string; docs: string[] };

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
    .build("/advisor/validate");

// DUMMY

type AdvisorRange = { start: number; end: number };

type AdvisorRuleViolation = {
    name: string;
    description: string;
    file_name: string;
    page_number: number;
    example: string;
    reason: string;
    proposal: string;
    source: string;
    collection: string;
    range?: AdvisorRange;
};

type ValidationResult = {
    rules: AdvisorRuleViolation[];
    checked?: number;
    total?: number;
};

async function dummyFetcher(options: FetcherOptions<BodyType>) {
    const body = options.body;
    const text: string = body.text;

    const rules = collectDummyViolations(text);
    // Split into two progress frames so the progress bar animates.
    const midpoint = Math.ceil(rules.length / 2);
    const items: ValidationResult[] = [
        {
            rules: rules.slice(0, midpoint),
            checked: midpoint,
            total: rules.length,
        },
        {
            rules: rules.slice(midpoint),
            checked: rules.length,
            total: rules.length,
        },
    ];

    const stream = toStream(items);

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}

type RuleDef = {
    name: string;
    description: string;
    reason: string;
    proposal: string;
    collection: string;
    file_name: string;
    page_number: number;
    pattern: RegExp;
};

const DUMMY_RULES: RuleDef[] = [
    {
        name: "Passivkonstruktionen vermeiden",
        description:
            "Vermeiden Sie Passivkonstruktionen, um den Text klarer und direkter zu gestalten.",
        reason: "Passivkonstruktionen schwächen die Aussage und verschleiern den Handelnden.",
        proposal:
            "Formulieren Sie den Satz aktiv mit dem Handelnden als Subjekt.",
        collection: "beispiel-collection",
        file_name: "beispiel-dokument.pdf",
        page_number: 1,
        pattern:
            /\b\w*(?:wurde|wird|worden|werden)\b[\s\S]{0,80}?\b\w*(?:worden|werden)\b/i,
    },
    {
        name: "Nominalstil reduzieren",
        description:
            "Ersetzen Sie substantivierte Konstruktionen („es wird/wird …“) durch klare Aussagen.",
        reason: "Der Nominalstil macht Sätze schwerfällig und unübersichtlich.",
        proposal: "Formulieren Sie mit einem klaren Verb und Subjekt.",
        collection: "beispiel-collection",
        file_name: "beispiel-dokument.pdf",
        page_number: 2,
        pattern:
            /\b(?:es wird|es sind|es gilt|es kommt zu)\b[\s\S]{0,60}?\b(?:möglich|notwendig|erforderlich|angebracht|empfohlen|vorgenommen|durchgeführt)\b/i,
    },
    {
        name: "Füllphrasen streichen",
        description:
            "Streichen Sie inhaltsleere Füllphrasen, die keine Information tragen.",
        reason: "Füllphrasen blähen den Text auf, ohne Inhalt hinzuzufügen.",
        proposal: "Kürzen Sie die Phrase ohne Bedeutungsverlust.",
        collection: "anderes-collection",
        file_name: "beispiel-anhang.pdf",
        page_number: 3,
        pattern:
            /\b(?:in angemessener Weise|im Rahmen von|im Zuge von|in diesem Zusammenhang|mit dem Ziel, um)\b/i,
    },
];

/**
 * Scans the text for the dummy rule patterns plus generic sentence-length
 * and compound-jargon heuristics. Each emitted violation carries its
 * matched `source` snippet and the absolute `range` offsets so the
 * frontend can render inline marks without its own offset bookkeeping.
 */
function collectDummyViolations(text: string): AdvisorRuleViolation[] {
    const violations: AdvisorRuleViolation[] = [];

    for (const rule of DUMMY_RULES) {
        const matches = matchAll(text, rule.pattern);
        for (const { start, end, source } of matches) {
            violations.push({
                collection: rule.collection,
                description: rule.description,
                example: "",
                file_name: rule.file_name,
                name: rule.name,
                page_number: rule.page_number,
                reason: rule.reason,
                proposal: rule.proposal,
                source,
                range: { start, end },
            });
        }
    }

    violations.push(...sentenceLengthViolations(text));
    violations.push(...compoundJargonViolations(text));

    // Stable order by position for predictable rail sorting.
    violations.sort((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0));
    return violations.slice(0, 20);
}

function matchAll(
    text: string,
    pattern: RegExp,
): { start: number; end: number; source: string }[] {
    const global = pattern.flags.includes("g")
        ? pattern
        : new RegExp(pattern.source, `${pattern.flags}g`);
    const out: { start: number; end: number; source: string }[] = [];
    let m = global.exec(text);
    while (m !== null) {
        if (m[0].length === 0) {
            global.lastIndex++;
            m = global.exec(text);
            continue;
        }
        out.push({
            start: m.index,
            end: m.index + m[0].length,
            source: m[0],
        });
        m = global.exec(text);
    }
    return out;
}

function sentenceLengthViolations(text: string): AdvisorRuleViolation[] {
    const out: AdvisorRuleViolation[] = [];
    // Split keeping offsets.
    const re = /[^.!?]+[.!?]+|\S[^.!?]*$/g;
    let m = re.exec(text);
    while (m !== null) {
        const sentence = m[0];
        const wordCount = (sentence.trim().match(/\S+/g) ?? []).length;
        if (wordCount > 20) {
            out.push({
                collection: "anderes-collection",
                description:
                    "Lange Sätze sind schwer lesbar. Teilen Sie sie in kürzere Teilsätze.",
                example: "",
                file_name: "beispiel-anhang.pdf",
                name: "Satzlänge prüfen",
                page_number: 4,
                reason: `Dieser Satz hat ${wordCount} Wörter. Empfohlen werden höchstens 20 Wörter pro Satz.`,
                proposal: "Teilen Sie den Satz in zwei kürzere Sätze auf.",
                source: sentence.trim().slice(0, 120),
                range: { start: m.index, end: m.index + sentence.length },
            });
        }
        m = re.exec(text);
    }
    return out;
}

function compoundJargonViolations(text: string): AdvisorRuleViolation[] {
    const out: AdvisorRuleViolation[] = [];
    const re = /[A-Za-zäöüÄÖÜ]{26,}/g;
    let m = re.exec(text);
    while (m !== null) {
        out.push({
            collection: "anderes-collection",
            description:
                "Lange Komposita sind schwer verständlich. Nutzen Sie kürzere Begriffe.",
            example: "",
            file_name: "beispiel-anhang.pdf",
            name: "Fachjargon vermeiden",
            page_number: 5,
            reason: `„${m[0]}“ ist ein sehr langes Kompositum (${m[0].length} Zeichen).`,
            proposal: "Verwenden Sie einen kürzeren, geläufigeren Begriff.",
            source: m[0],
            range: { start: m.index, end: m.index + m[0].length },
        });
        m = re.exec(text);
    }
    return out;
}
