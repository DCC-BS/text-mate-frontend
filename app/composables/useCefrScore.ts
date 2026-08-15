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
    const logger = useLogger();

    const isLoading = ref(true);
    const cefrLevel = ref<string | undefined>(undefined);
    const zixScore = ref<number | undefined>(undefined);
    const error = ref<string | undefined>(undefined);
    const language = ref<string | undefined>(undefined);
    const score = ref<number | undefined>(undefined);
    const scoreLabel = ref<string | undefined>(undefined);
    const band = ref<ReadabilityBand | undefined>(undefined);

    let abortController: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

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
            score.value = result.score ?? result.zix_score ?? undefined;
            scoreLabel.value = result.score_label ?? undefined;
            band.value = result.band ?? undefined;
        } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") {
                return;
            }
            logger.error(
                { err },
                "Failed to fetch CEFR understandability score",
            );
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

    function evaluateTextDebounced(): void {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(evaluateText, 3000);
    }

    onMounted(async (): Promise<void> => {
        await evaluateText();
    });

    watch(
        () => text.value,
        (): void => {
            evaluateTextDebounced();
        },
    );

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
