import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";

type BodyType = { text: string; docs: string[] };

export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>(async (event) => {
        const { text, docs } = await readBody(event);

        if (!text || !docs) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid input",
            });
        }

        return { text, docs };
    })
    .withDummyFetcher(dummyFetcher)
    .build("/advisor/validate");

// DUMMY

type AdvisorRuleViolation = {
    name: string;
    description: string;
    file_name: string;
    page_number: number;
    example: string;
    reason: string;
    proposal: string;
    source: string;
};

type ValidationResult = {
    rules: AdvisorRuleViolation[];
};

async function dummyFetcher(options: FetcherOptions<BodyType>) {
    const body = options.body;
    const docs = body.docs as string[];

    const items: ValidationResult[] = docs.includes("beispiel-dokument.pdf")
        ? [
              {
                  rules: [
                      {
                          description:
                              "Vermeiden Sie die Verwendung von Passivkonstruktionen, um den Text klarer und direkter zu gestalten.",
                          example:
                              "Das Dokument wurde von Max Mustermann verfasst.",
                          file_name: "beispiel-dokument.pdf",
                          name: "Passivkonstruktionen vermeiden",
                          page_number: 1,
                          reason: "Der Einsatz von Passivkonstruktionen kann die Klarheit und Direktheit des Textes beeinträchtigen.",
                          proposal:
                              "Formulieren Sie Sätze aktiver, indem Sie die handelnden Personen hervorheben.",
                          source: "https://www.duden.de/rechtschreibung/passiv",
                      },
                  ],
              },
              {
                  rules: [
                      {
                          description:
                              "Vermeiden Sie die Verwendung von Füllwörtern, um den Text prägnanter zu gestalten.",
                          example: "Eigentlich ist das Dokument ziemlich gut.",
                          file_name: "beispiel-dokument.pdf",
                          name: "Füllwörter vermeiden",
                          page_number: 2,
                          reason: "Füllwörter können den Text unnötig aufblähen und die Lesbarkeit beeinträchtigen.",
                          proposal:
                              "Streichen Sie überflüssige Wörter, um den Text klarer und prägnanter zu machen.",
                          source: "https://www.duden.de/sprachwissen/sprachratgeber/Fuellwoerter",
                      },
                  ],
              },
          ]
        : [{ rules: [] }];

    const stream = toStream(items);

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
