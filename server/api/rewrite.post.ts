export default apiHandler
    .withMethod("POST")
    .withDummyFetcher((options) => ({
        rewrittenText: `Rewritten: ${(options as any).body.text}`,
    }))
    .build("/text-rewrite");
