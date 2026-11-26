import type { AdvisorDocumentDescription } from "~~/shared/types/advisor";

export default apiHandler
    .withMethod("GET")
    .withDummyFetcher(getDummyData())
    .build("/advisor/docs");

// DUMMY

// Mirrors the enriched backend contract: per-file metadata (title,
// description, size) and the document-level rule_count.
function getDummyData(): AdvisorDocumentDescription[] {
    return [
        {
            id: "bundeskanzlei",
            title: "Bundeskanzlei",
            author: "Bundeskanzlei",
            description:
                "Verbindliche Grundlagen der Bundeskanzlei für die deutsche Sprache in der Bundesverwaltung.",
            edition: "Ausgabe 2024",
            rule_count: 51,
            files: [
                {
                    name: "schreibweisungen.pdf",
                    title: "Schreibweisungen",
                    description:
                        "Verbindliche Schreibweisungen der Bundeskanzlei für die deutsche Sprache in der Bundesverwaltung",
                    size: 3768435,
                },
                {
                    name: "rechtschreibleitfaden-2017.pdf",
                    title: "Rechtschreibleitfaden 2017",
                    description:
                        "Leitfaden zur deutschen Rechtschreibung der Bundeskanzlei, Ausgabe 2017",
                    size: 842170,
                },
            ],
        },
        {
            author: "Erika Mustermann",
            title: "Anderes Dokument",
            description:
                "Ein weiteres Beispiel-Dokument mit nützlichen Informationen.",
            edition: "2. Auflage",
            id: "anderes-collection",
            rule_count: 12,
            files: [
                {
                    name: "anderes-dokument.pdf",
                    title: "",
                    description: "",
                    size: 1048576,
                },
            ],
        },
    ];
}
