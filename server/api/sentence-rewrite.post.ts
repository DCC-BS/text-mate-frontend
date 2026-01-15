export default apiHandler
    .withMethod("POST")
    .withDummyFetcher((options) => {
        const body = options.body as { sentence: string; context: string };

        return { options: [`${body.sentence} 1`, `${body.sentence} 2`] };
    })
    .build("/sentence-rewrite");
