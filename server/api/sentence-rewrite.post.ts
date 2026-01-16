type BodyType = {
    sentence: string;
    context: string;
};

export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>()
    .withDummyFetcher(({ body }) => ({
        options: [`${body.sentence} 1`, `${body.sentence} 2`],
    }))
    .build("/sentence-rewrite");
