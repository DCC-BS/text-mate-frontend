type AdvisorDocumentDescription = {
    title: string;
    description: string;
    author: string;
    edition: string;
    file: string;
};

export default defineEventHandler(async (event) => {
    return [
        {
            author: "John Doe",
            description: "A sample advisor document.",
            edition: "1st Edition",
            file: "sample-doc.pdf",
            title: "Sample Document",
        },
        {
            author: "Jane Smith",
            description: "Another sample advisor document.",
            edition: "2nd Edition",
            file: "another-sample-doc.pdf",
            title: "Another Sample Document",
        },
    ] as AdvisorDocumentDescription[];
});
