export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const body = await readBody(event);

    const response = await $fetch(`${config.apiUrl}/text-correction`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });

    return response;
});
