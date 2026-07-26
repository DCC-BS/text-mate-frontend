import {
    apiFetch,
    apiStreamFetch,
    isApiError,
} from "@dcc-bs/communication.bs.js";
import { v7 as uuid } from "uuid";
import { z } from "zod";
import type {
    AdvisorThread,
    AdvisorThreadResult,
} from "~/assets/models/advisor";
import {
    type AdvisorDocumentDescription,
    AdvisorDocumentDescriptionSchema,
    type FixThread,
    type ValidationResult,
    ValidationResultSchema,
} from "~~/shared/types/advisor";

async function getDocs(
    t: (key: string) => string,
): Promise<AdvisorDocumentDescription[]> {
    const { sendError } = useUseErrorDialog();

    const response = await apiFetch("api/advisor/docs", {
        schema: z.array(AdvisorDocumentDescriptionSchema),
    });

    if (isApiError(response)) {
        sendError(t(`errors.${response.errorId}`) || response.message);
        return [];
    }

    return response;
}

const docs = ref<AdvisorDocumentDescription[]>([]);

// Caches the in-flight docs request so the several components that call
// useAdvisor() during the same first paint share one fetch instead of racing
// N identical requests. Reset to null on failure so the next call can retry.
let docsPromise: Promise<void> | null = null;

export function useAdvisor() {
    const { t } = useI18n();
    const logger = useLogger();

    // lazy load docs on first use (client-only: the fetch needs a browser
    // origin and the error path uses useToast, neither of which are available
    // during SSR).
    if (import.meta.client && docs.value.length === 0 && docsPromise === null) {
        docsPromise = getDocs(t)
            .then((x) => {
                docs.value = x;
            })
            .catch((err: unknown) => {
                console.error("Failed to load advisor docs:", err);
                docsPromise = null;
            });
    }

    async function getDocFile(name: string): Promise<Blob> {
        if (!docs.value.some((d) => d.files.includes(name))) {
            throw new Error("Document not found");
        }

        const response = await fetch(`api/advisor/doc/${name}`);

        if (!response.ok) {
            throw new Error("Failed to fetch document");
        }

        return response.blob();
    }

    /**
     * Streams validation results from the backend. Each SSE event is emitted as
     * a `data: <ValidationResult>` block.
     */
    async function* validate(
        text: string,
        docs: string[],
        signal?: AbortSignal,
    ): AsyncGenerator<AdvisorThreadResult, void, void> {
        const response = await apiStreamFetch("api/advisor/validate", {
            method: "POST",
            body: {
                text,
                docs,
            },
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
            | { success: true; data: ValidationResult }
            | { success: false; error: unknown } {
            try {
                const result = ValidationResultSchema.parse(
                    JSON.parse(json),
                ) as ValidationResult;
                return { success: true, data: result };
            } catch (e) {
                return { success: false, error: e };
            }
        }

        // Maps a backend ValidationResult into the thread batch yielded to the UI.
        function toThreadResult(result: ValidationResult): AdvisorThreadResult {
            return {
                checked: result.checked,
                total: result.total,
                threads: result.violations.map(
                    (x) =>
                        ({
                            id: `t-${uuid()}`,
                            notes: [],
                            status: "to-fix",
                            type: "violation",
                            violation: x,
                            range: x.range,
                        }) as AdvisorThread,
                ),
            } as AdvisorThreadResult;
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

                // The backend emits JSON Lines: one JSON record per line. A
                // single read() can coalesce several records ("{...}\n{...}\n")
                // or split one across reads, so parse every complete line and
                // keep the trailing partial in the buffer. Parsing the whole
                // buffer as one JSON value breaks on coalesced frames.
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
                        continue;
                    }

                    yield toThreadResult(parseResult.data);
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
                    yield toThreadResult(parseResult.data);
                    buffer = "";
                }
            }

            // Anything left is a malformed/partial record the parser could not
            // recover from.
            if (buffer.trim() !== "") {
                logger.error(
                    { buffer: buffer, error: String(lastError) },
                    "Validate stream resulted in a parse error.",
                );
                throw new Error(t("errors.unexpected_error"));
            }
        } finally {
            reader.releaseLock();
        }
    }

    async function* fix(
        text: string,
        threads: FixThread[],
        signal?: AbortSignal,
    ): AsyncGenerator<string, void, void> {
        const response = await apiStreamFetch("api/advisor/fix", {
            method: "POST",
            body: {
                text,
                threads,
            },
            signal,
        });

        if (isApiError(response)) {
            throw response;
        }

        const reader = response.getReader();
        const decoder = new TextDecoder();

        try {
            let isDone = false;
            while (!isDone) {
                const { value, done } = await reader.read();
                isDone = done;

                yield decoder.decode(value, { stream: true });
            }
        } finally {
            reader.releaseLock();
        }
    }

    return {
        docs,
        getDocFile,
        validate,
        fix,
    };
}
