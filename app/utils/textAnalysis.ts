import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type {
    TextAnalysisInput,
    TextAnalysisResult,
} from "~/assets/models/text-analysis";

/**
 * Sends a request to the backend proxy endpoint `/api/text-analysis`
 * to analyze the understandability score and CEFR level for a German text.
 *
 * @param text The German text to analyze
 * @returns A promise that resolves to the TextAnalysisResult
 */
export async function getTextAnalysis(
    text: string,
    signal?: AbortSignal,
): Promise<TextAnalysisResult> {
    const body: TextAnalysisInput = {
        text: text,
    };

    const response = await apiFetch<TextAnalysisResult>("api/text-analysis", {
        method: "POST",
        body: body,
        headers: {
            "Content-Type": "application/json",
        },
        signal,
    });

    if (isApiError(response)) {
        throw response;
    }

    return response;
}
