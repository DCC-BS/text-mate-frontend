type BodyType = { word: string };

export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>()
    .withDummyFetcher(({ body }) => ({
        synonyms: [
            `Synonym1 for: ${body.word}`,
            `Synonym2 for: ${body.word}`,
            `Synonym3 for: ${body.word}`,
        ],
    }))
    .build("/word-synonym");
