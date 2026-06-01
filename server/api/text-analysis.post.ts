type BodyType = {
    text: string;
};

/**
 * Nuxt API route for text analysis.
 * Proxies POST requests to `/text-analysis` on the FastAPI backend.
 */
export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>()
    .withDummyFetcher(() => ({
        zix_score: 1.5,
        cefr_level: "B2",
    }))
    .build("/text-analysis");
