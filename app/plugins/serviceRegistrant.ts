import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type { ILogger } from "@dcc-bs/logger.bs.js";
import type { AdvisorDocumentDescription } from "~/assets/models/advisor";
import { UserDictionaryQuery } from "~/assets/queries/user_dictionary.query";
import { AdvisorService } from "~/assets/services/AdvisorService";
import { CorrectionFetcher } from "~/assets/services/CorrectionFetcher";
import { CorrectionService } from "~/assets/services/CorrectionService";

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
        builder.register(CorrectionFetcher);

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

        builder.registerFactory(
            (
                logger: ILogger,
                correctionFetcher: CorrectionFetcher,
                t: (key: string) => string,
                onError: (message: string) => void,
                language = "auto",
            ) => {
                const { executeCommand } = useCommandBus();

                return new CorrectionService(
                    logger,
                    correctionFetcher,
                    executeCommand,
                    t,
                    onError,
                    language,
                );
            },
            ["logger", CorrectionFetcher, "translate"],
            "correctionService",
        );
    });

    nuxtApp.provide("serviceOrchestrator", orchestrator);
});
