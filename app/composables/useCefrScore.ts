import { isApiError } from "@dcc-bs/communication.bs.js";
import type { Ref } from "vue";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { getTextAnalysis } from "~/utils/textAnalysis";
import type { ReadabilityBand } from "~~/shared/types/simplify";

/**
 * Vue Composable that manages fetching the CEFR understandability score for a text.
 * Orchestrates calls to the server proxy endpoint, manages loading and error state,
 * and responds to text changes with a 3-second debounce.
 *
 * Automatically handles aborting pending HTTP requests and clearing timers
 * when stats are no longer visible (component is unmounted).
 *
 * @param text A Vue Ref containing the German text to analyze
 * @returns An object with reactive references for loading state, CEFR level, ZIX score, and any error message.
 */
export function useCefrScore(text: Ref<string>) {
    const { t } = useI18n();

    const isLoading = ref(true);
    const cefrLevel = ref<string | undefined>(undefined);
    const zixScore = ref<number | undefined>(undefined);
    const error = ref<string | undefined>(undefined);
    // Language-aware extension of the endpoint: the detected language and its
    // own metric, for languages that have no CEFR mapping (spec §10).
    const language = ref<string | undefined>(undefined);
    const score = ref<number | undefined>(undefined);
    const scoreLabel = ref<string | undefined>(undefined);
    const band = ref<ReadabilityBand | undefined>(undefined);

    let abortController: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    /**
     * Executes the CEFR understandability analysis using the client utility.
     * Manages loading states, aborts active requests, and handles API errors gracefully.
     */
    async function evaluateText(): Promise<void> {
        if (abortController) {
            abortController.abort();
        }

        const controller = new AbortController();
        abortController = controller;
        isLoading.value = true;
        error.value = undefined;

        try {
            const result = await getTextAnalysis(text.value, controller.signal);
            zixScore.value =
                result.zix_score !== null ? result.zix_score : undefined;
            cefrLevel.value =
                result.cefr_level !== null ? result.cefr_level : undefined;
            language.value = result.language ?? undefined;
            // Fall back to the German score so the badge keeps a value while
            // the backend still answers with `zix_score` only.
            score.value = result.score ?? result.zix_score ?? undefined;
            scoreLabel.value = result.score_label ?? undefined;
            band.value = result.band ?? undefined;
        } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") {
                return;
            }
            console.error("Failed to fetch CEFR understandability score:", err);
            if (isApiError(err)) {
                error.value = t(`errors.${err.errorId}`) || err.message;
            } else if (err instanceof Error) {
                error.value = err.message;
            } else {
                error.value = t("errors.unexpected_error");
            }
        } finally {
            if (!controller.signal.aborted) {
                isLoading.value = false;
            }
        }
    }

    /**
     * Debounces the evaluation function by 3 seconds (3000ms) when the text is edited,
     * reducing unnecessary computations on the backend.
     */
    function evaluateTextDebounced(): void {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(async (): Promise<void> => {
            await evaluateText();
        }, 3000);
    }

    // Run evaluation immediately when the component is mounted
    onMounted(async (): Promise<void> => {
        await evaluateText();
    });

    // Re-evaluate with a 3-second debounce whenever the source text changes
    watch(
        () => text.value,
        (): void => {
            evaluateTextDebounced();
        },
    );

    // Cancel any pending evaluations and abort active fetch requests when unmounted
    onUnmounted((): void => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        if (abortController) {
            abortController.abort();
        }
    });

    return {
        isLoading,
        cefrLevel,
        zixScore,
        language,
        score,
        scoreLabel,
        band,
        error,
    };
}
