type AdvisorDocumentDescription = {
    title: string;
    description: string;
    author: string;
    edition: string;
    id: string;
    files: string[];
};

export default apiHandler
    .withMethod("GET")
    .withDummyFetcher(getDummyData())
    .build("/advisor/docs");

// DUMMY

function getDummyData() {
    return [
        {
            author: "Max Mustermann",
            description:
                "Ein Beispiel-Dokument zur Demonstration der Advisor-Funktionalität.",
            edition: "1. Auflage",
            id: "beispiel-collection",
            files: ["beispiel-dokument.pdf", "beispiel-anhang.pdf"],
            title: "Beispiel-Dokument",
        },
        {
            author: "Erika Mustermann",
            description:
                "Ein weiteres Beispiel-Dokument mit nützlichen Informationen.",
            edition: "2. Auflage",
            id: "anderes-collection",
            files: ["anderes-dokument.pdf"],
            title: "Anderes Dokument",
        },
    ] as AdvisorDocumentDescription[];
}
