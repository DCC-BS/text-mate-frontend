export default apiHandler
    .withMethod("POST")
    .withBodyProvider(async (event) => {
        const { text, docs } = await readBody(event);

        if (!text || !docs) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid input",
            });
        }

        return { text, docs };
    })
    .withFetcher(async ({ url, method, body, headers, event }) => {
        const signal = getAbortSignal(event);

        // Ensure Content-Type is set for JSON payloads
        const fetchHeaders = {
            "Content-Type": "application/json",
            ...headers,
        };

        try {
            const response = await fetch(url, {
                method,
                body: JSON.stringify(body),
                headers: fetchHeaders,
                signal,
            });

            if (!response.ok) {
                throw createError({
                    statusCode: response.status,
                    statusMessage: `Fetch failed: ${response.statusText}`,
                });
            }

            return response;
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw createError({
                    statusCode: 499,
                    statusMessage: "Request aborted",
                });
            }
            throw error;
        }
    })
    .build("/advisor/validate");
