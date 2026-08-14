import { apiStreamFetch, isApiError } from "@dcc-bs/communication.bs.js";
import {
    type ReadabilityBand,
    type SimplifyDoneEvent,
    type SimplifyEvent,
    SimplifyEventSchema,
    type SimplifyMode,
    type SimplifyStage,
} from "~~/shared/types/simplify";

/**
 * Everything the progress UI needs while the simplification loop runs. Filled
 * from the `start` event and refreshed by every `progress` event.
 */
export type SimplifyProgressState = {
    /** Rewrite unit selection reported by the backend. */
    mode: SimplifyMode;
    /** Detected language of the text (not the UI locale). */
    language?: string;
    /** Metric name, e.g. `ZIX` or `LIX`. Absent when the text is not scored. */
    scoreLabel?: string;
    /** False for languages without a readability analyzer — never fake a score. */
    scored: boolean;
    /** 1-based attempt of the rewrite loop. */
    attempt: number;
    /** Which gate is running. Readability is the only one, so it may be absent. */
    stage?: SimplifyStage;
    /** Units the text was split into (paragraphs merged forward to ~100 words before scoring). */
    unitsTotal: number;
    /** Units already inside the target band. */
    unitsInTarget: number;
    scoreBefore?: number;
    bandBefore?: ReadabilityBand;
    cefrBefore?: string;
    /** Score of the latest attempt. */
    score?: number;
    band?: ReadabilityBand;
    cefr?: string;
};

function initialProgress(): SimplifyProgressState {
    return {
        mode: "whole",
        scored: false,
        attempt: 1,
        unitsTotal: 0,
        unitsInTarget: 0,
    };
}

// Module-level singleton state: one simplification runs at a time per session,
// and the progress panel, the diff header and the workspace all read the same
// values. This codebase keeps shared state in module refs, not in a store.
const isRunning = ref(false);
const progress = ref<SimplifyProgressState>(initialProgress());
const result = ref<SimplifyDoneEvent | undefined>(undefined);
/**
 * The simplified text, set once from the authoritative `done.text`. Empty until
 * the run finishes.
 *
 * It is deliberately *not* assembled incrementally from `chunk_done`. That was
 * tried and was wrong in a way no test caught: `chunk_done.index` addresses the
 * backend's **merged** units (short paragraphs folded forward to ~100 words,
 * `docs/simplify_redesign.md` §14.2), while the only splitting a client can do
 * on its own is on blank lines. On a real document those are different spaces —
 * 23 units against 40-plus raw blocks — so every finished unit was spliced in at
 * an unrelated position, and the preview showed text that had never existed.
 * Reconstructing it client-side would need each unit's source span, which is
 * only known at `done` anyway. The progress panel is what reports the run while
 * it is in flight; text appears when it is real.
 */
const simplifiedText = ref("");

let abortController: AbortController | undefined;

/**
 * Owns the `POST /api/simplify` stream: parses the JSON Lines event sequence,
 * validates every line, and exposes the loop's progress plus the resulting
 * text. The diff itself is produced client-side by the existing DiffViewer —
 * the backend returns final text only.
 */
export function useSimplify() {
    const { t, locale } = useI18n();
    const logger = useLogger();

    /**
     * Streams the simplification events from the backend. The response body is
     * JSON Lines: one JSON record per line, *not* SSE — there is no `data:`
     * prefix and no blank-line separator.
     */
    async function* streamSimplify(
        text: string,
        signal?: AbortSignal,
    ): AsyncGenerator<SimplifyEvent, void, void> {
        const response = await apiStreamFetch("api/simplify", {
            method: "POST",
            // `language` is the UI locale and only a hint: the backend detects the
            // real language from the text and that always wins. It is sent so the
            // backend can log detected-vs-hinted disagreement (T5.1); without it
            // that metric has nothing to compare against.
            body: { text, language: locale.value },
            signal,
        });

        if (isApiError(response)) {
            throw response;
        }

        const reader = response.getReader();
        const decoder = new TextDecoder();

        function tryParse(
            json: string,
        ):
            | { success: true; data: SimplifyEvent }
            | { success: false; error: unknown } {
            try {
                return {
                    success: true,
                    data: SimplifyEventSchema.parse(JSON.parse(json)),
                };
            } catch (error: unknown) {
                return { success: false, error };
            }
        }

        try {
            let buffer = "";
            let lastError: unknown;

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                // A single read() can coalesce several records
                // ("{...}\n{...}\n") or split one across reads, so parse every
                // complete line and keep the trailing partial in the buffer.
                // Parsing the whole buffer as one JSON value breaks on
                // coalesced frames.
                while (true) {
                    const newlineIndex = buffer.indexOf("\n");
                    if (newlineIndex === -1) {
                        break;
                    }
                    const line = buffer.slice(0, newlineIndex);
                    buffer = buffer.slice(newlineIndex + 1);

                    if (line.trim() === "") {
                        continue;
                    }

                    const parseResult = tryParse(line);
                    if (!parseResult.success) {
                        lastError = parseResult.error;
                        logger.warn(
                            { line, error: String(parseResult.error) },
                            "Skipping unparseable simplify event.",
                        );
                        continue;
                    }

                    yield parseResult.data;
                }
            }

            // Flush the decoder and any trailing record the producer did not
            // terminate with a newline.
            buffer += decoder.decode();
            const trailing = buffer.trim();
            if (trailing !== "") {
                const parseResult = tryParse(trailing);
                if (!parseResult.success) {
                    lastError = parseResult.error;
                } else {
                    yield parseResult.data;
                    buffer = "";
                }
            }

            // Anything left is a malformed/partial record the parser could not
            // recover from.
            if (buffer.trim() !== "") {
                logger.error(
                    { buffer, error: String(lastError) },
                    "Simplify stream resulted in a parse error.",
                );
                throw new Error(t("errors.unexpected_error"));
            }
        } finally {
            reader.releaseLock();
        }
    }

    /** Folds one event into the reactive state. */
    function applyEvent(event: SimplifyEvent): void {
        if (event.event === "start") {
            progress.value = {
                ...initialProgress(),
                mode: event.mode,
                language: event.language,
                scoreLabel: event.score_label,
                scored: event.scored,
                unitsTotal: event.units,
                scoreBefore: event.score_before,
                bandBefore: event.band_before,
                cefrBefore: event.cefr_before,
                score: event.score_before,
                band: event.band_before,
                cefr: event.cefr_before,
            };
            return;
        }

        if (event.event === "progress") {
            progress.value = {
                ...progress.value,
                attempt: event.attempt,
                stage: event.stage,
                score: event.score ?? progress.value.score,
                band: event.band ?? progress.value.band,
                cefr: event.cefr ?? progress.value.cefr,
                unitsInTarget:
                    event.units_in_target ?? progress.value.unitsInTarget,
            };
            return;
        }

        // `chunk_done` carries no text this client can place: its `index` is in
        // the backend's merged-unit space, which is not the blank-line split of
        // the source (see `simplifiedText`). Unit counting is driven by the
        // `progress` events instead, which report it in the same population
        // `start.units` established. Nothing to fold in here.
        if (event.event === "chunk_done") {
            return;
        }

        result.value = event;
        simplifiedText.value = event.text;
        progress.value = {
            ...progress.value,
            scored: event.scored,
            language: event.language ?? progress.value.language,
            scoreLabel: event.score_label ?? progress.value.scoreLabel,
            scoreBefore: event.score_before ?? progress.value.scoreBefore,
            bandBefore: event.band_before ?? progress.value.bandBefore,
            cefrBefore: event.cefr_before ?? progress.value.cefrBefore,
            score: event.score_after ?? progress.value.score,
            band: event.band_after ?? progress.value.band,
            cefr: event.cefr_after ?? progress.value.cefr,
        };
    }

    /** Clears the state of a previous run. */
    function reset(): void {
        progress.value = initialProgress();
        result.value = undefined;
        simplifiedText.value = "";
    }

    /** Aborts an in-flight run, if any. */
    function abort(): void {
        abortController?.abort();
        abortController = undefined;
    }

    /**
     * Runs the simplification loop over `text`.
     *
     * @returns true when a `done` event was received; false when the run was
     *          aborted before it finished.
     * @throws the backend {@link ApiError} or a parse error — callers surface it.
     */
    async function run(text: string): Promise<boolean> {
        // A new run supersedes an older one.
        abort();
        const controller = new AbortController();
        abortController = controller;

        reset();
        isRunning.value = true;

        try {
            for await (const event of streamSimplify(text, controller.signal)) {
                if (controller.signal.aborted) {
                    return false;
                }
                applyEvent(event);
            }
            return result.value !== undefined;
        } catch (error: unknown) {
            if (controller.signal.aborted) {
                return false;
            }
            throw error;
        } finally {
            isRunning.value = false;
            if (abortController === controller) {
                abortController = undefined;
            }
        }
    }

    return {
        isRunning: readonly(isRunning),
        progress: readonly(progress),
        result: readonly(result),
        simplifiedText: readonly(simplifiedText),
        run,
        abort,
        reset,
    };
}
