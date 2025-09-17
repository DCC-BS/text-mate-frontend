export default defineBackendHandler({
    url: "/quick-action",
    method: "POST",
    fetcher: async (options) => {
        const { url, method, body, headers, event } = options;

        const signal = getAbortSignal(event);

        return await fetch(url, {
            method,
            body: JSON.stringify(body),
            headers: headers,
            signal,
        });
    },
});
