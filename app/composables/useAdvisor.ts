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
import { v7 as uuid } from "uuid";

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

    // lazy load docs on first use (client-only: the fetch needs a browser
    // origin and the error path uses useToast, neither of which are available
    // during SSR).
    if (import.meta.client && docs.value.length === 0) {
        console.log("Loading advisor docs...");
        getDocs(t)
            .then((x) => (docs.value = x))
            .catch((err: unknown) =>
                console.error("Failed to load advisor docs:", err),
            );
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
