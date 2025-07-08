export default defineBackendHandler({
    url: "/quick-action",
    method: "POST",
    fetcher: async (url, method, body, headers) => {
        return await fetch(url, {
            method,
            body: JSON.stringify(body),
            headers: headers,
        });
    },
});
