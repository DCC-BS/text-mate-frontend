export default apiHandler
    .withMethod("POST")
    .withDummyFetcher((options) => ({
        synonyms: [
            `Synonym1 for: ${(options as any).body.word}`,
            `Synonym2 for: ${(options as any).body.word}`,
            `Synonym3 for: ${(options as any).body.word}`,
        ],
    }))
    .build("/word-synonym");
