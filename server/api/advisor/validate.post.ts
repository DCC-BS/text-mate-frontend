import type { ValidationResult } from "~/assets/models/advisor";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const { text, docs } = await readBody(event);

    if (!text || !docs) {
        throw createError({ statusCode: 400, statusMessage: "Invalid input" });
    }

    return await $fetch<ValidationResult>(
        `${config.public.apiUrl}/advisor/validate`,
        {
            method: "POST",
            body: {
                text,
                docs,
            },
        },
    );
});
