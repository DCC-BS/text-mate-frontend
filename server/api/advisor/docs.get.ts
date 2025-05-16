import type { AdvidorDocumentDescription } from "~/assets/models/advisor";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    return await $fetch<AdvidorDocumentDescription[]>(
        `${config.public.apiUrl}/advisor/docs`,
    );
});
