export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const body = await readBody(event);

    const response = await fetch(`${config.public.apiUrl}/quick-action`, {
        method: "POST",

        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });

    return new Response(response.body);
});
