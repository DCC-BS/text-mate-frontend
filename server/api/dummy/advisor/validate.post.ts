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

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const docs = body.docs as string[];

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (docs.includes("beispiel-dokument.pdf")) {
        return {
            rules: [
                {
                    description:
                        "Vermeiden Sie die Verwendung von Passivkonstruktionen, um den Text klarer und direkter zu gestalten.",
                    example: "Das Dokument wurde von Max Mustermann verfasst.",
                    file_name: "beispiel-dokument.pdf",
                    name: "Passivkonstruktionen vermeiden",
                    page_number: 1,
                    reason: "Der Einsatz von Passivkonstruktionen kann die Klarheit und Direktheit des Textes beeinträchtigen.",
                    proposal:
                        "Formulieren Sie Sätze aktiver, indem Sie die handelnden Personen hervorheben.",
                    source: "https://www.duden.de/rechtschreibung/passiv",
                },
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
        } as ValidationResult;
    }
    if (docs.includes("anderes-dokument.pdf")) {
        return {
            rules: [],
        } as ValidationResult;
    }

    return { rules: [] } as ValidationResult;
});
