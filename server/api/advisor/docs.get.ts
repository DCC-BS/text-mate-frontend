import type { AdvisorDocumentDescription } from "~/assets/models/advisor";

export default defineEventHandler(async () => {
    const config = useRuntimeConfig();

    return await $fetch<AdvisorDocumentDescription[]>(
        `${config.public.apiUrl}/advisor/docs`,
    );
});
