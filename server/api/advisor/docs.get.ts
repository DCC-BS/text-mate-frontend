type AdvisorDocumentDescription = {
    title: string;
    description: string;
    author: string;
    edition: string;
    file: string;
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
            file: "beispiel-dokument.pdf",
            title: "Beispiel-Dokument",
        },
        {
            author: "Erika Mustermann",
            description:
                "Ein weiteres Beispiel-Dokument mit nützlichen Informationen.",
            edition: "2. Auflage",
            file: "anderes-dokument.pdf",
            title: "Anderes Dokument",
        },
    ] as AdvisorDocumentDescription[];
}
