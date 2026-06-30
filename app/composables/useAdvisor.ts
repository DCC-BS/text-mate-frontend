import {
    apiFetch,
    apiStreamFetch,
    isApiError,
} from "@dcc-bs/communication.bs.js";
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

export function useAdvisor() {
    const { t } = useI18n();

    // lazy load docs on first use
    if (docs.value.length === 0) {
        console.log("Loading advisor docs...");
        getDocs(t).then((x) => (docs.value = x));
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

        try {
            let isDone = false;
            while (!isDone) {
                const { value, done } = await reader.read();
                isDone = done;

                const json = decoder.decode(value, { stream: true });

                if (!json) {
                    continue;
                }

                const result = ValidationResultSchema.parse(
                    JSON.parse(json),
                ) as ValidationResult;

                yield {
                    threads: result.rules.map(
                        (x) =>
                            ({
                                id: x.id,
                                notes: [],
                                status: "to-fix",
                                type: "violation",
                                violation: x,
                                range: x.range,
                            }) as AdvisorThread,
                    ),
                } as AdvisorThreadResult;
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
        let buffer = "";

        try {
            let isDone = false;
            while (!isDone) {
                const { value, done } = await reader.read();
                isDone = done;

                buffer += decoder.decode(value, { stream: true });

                yield buffer;
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

/**
 * Extracts plain-text deltas from an SSE buffer. Lines carrying an
 * `event:` field (e.g. the terminal `done` frame) are skipped; only
 * `data:` payloads are returned as text.
 */
function extractTextDeltas(
    buffer: string,
    flush = false,
): { deltas: string[]; remaining: string } {
    const deltas: string[] = [];
    let remaining = buffer;

    while (true) {
        const separatorIndex = remaining.indexOf("\n\n");
        if (separatorIndex === -1) {
            break;
        }

        const rawEvent = remaining.slice(0, separatorIndex);
        remaining = remaining.slice(separatorIndex + 2);

        // Terminal control frame — no text payload.
        if (rawEvent.startsWith("event:")) {
            continue;
        }

        for (const line of rawEvent.replaceAll("\r", "").split("\n")) {
            if (line.startsWith("data:")) {
                deltas.push(line.slice(5));
            }
        }
    }

    if (flush && remaining.trim().length > 0) {
        if (!remaining.startsWith("event:")) {
            for (const line of remaining.replaceAll("\r", "").split("\n")) {
                if (line.startsWith("data:")) {
                    deltas.push(line.slice(5));
                }
            }
        }
        remaining = "";
    }

    return { deltas, remaining };
}
