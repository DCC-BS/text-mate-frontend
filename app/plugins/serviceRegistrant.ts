import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type { AdvisorDocumentDescription } from "~/assets/models/advisor";
import { UserDictionaryQuery } from "~/assets/queries/user_dictionary.query";
import { AdvisorService } from "~/assets/services/AdvisorService";

export default defineNuxtPlugin((nuxtApp) => {
    const orchestrator = new ServiceOrchestrator();

    // the setup will be lazily called the first time a
    // service is resolved, ensuring services are created
    // in the Vue component lifecycle or setup context.
    orchestrator.setup((builder) => {
        const logger = useLogger();
        const { t } = useI18n(); // this needs to be created in the setup context
        const { sendError } = useUseErrorDialog();

        builder.registerInstance("translate", t);
        builder.registerInstance("logger", logger);

        builder.register(UserDictionaryQuery);

        builder.registerAsyncFactory(
            async () => {
                const response =
                    await apiFetch<AdvisorDocumentDescription[]>(
                        "api/advisor/docs",
                    );

                if (isApiError(response)) {
                    sendError(
                        t(`errors.${response.errorId}`) || response.message,
                    );
                    return;
                }

                return new AdvisorService(response);
            },
            [],
            "advisorService",
        );
    });

    nuxtApp.provide("serviceOrchestrator", orchestrator);
});
