import { TextActionInputSchema } from "#shared/text-actions";

export default defineBackendHandler({
    url: "/quick-action",
    method: "POST",
    fetcher: async (options) => {
        const { url, method, body, headers, event } = options;

        const validatedBody = TextActionInputSchema.parse(body);

        const signal = getAbortSignal(event);

        return await fetch(url, {
            method,
            body: JSON.stringify(validatedBody),
            headers: headers,
            signal,
        });
    },
});
