import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type {
    SentenceRewriteInput,
    SentenceRewriteResult,
} from "~/assets/models/sentence-rewrite";

export function useSentenceRewrite() {
    const { sendError } = useUseErrorDialog();
    const { t } = useI18n();

    async function getAlternativeSentences(
        sentence: string,
        context: string,
    ): Promise<SentenceRewriteResult> {
        let newContext = "";
        if (context.length < 1000) {
            newContext = context;
        }

        const body = {
            sentence,
            context: newContext,
        } as SentenceRewriteInput;

        const response = await apiFetch<SentenceRewriteResult>(
            "/api/sentence-rewrite",
            {
                method: "POST",
                body: body,
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );

        if (isApiError(response)) {
            sendError(t(`errors.${response.errorId}`) || response.message);
            throw response;
        }

        return response;
    }

    return {
        getAlternativeSentences,
    };
}
