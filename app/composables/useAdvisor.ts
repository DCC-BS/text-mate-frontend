import {
    apiFetch,
    apiStreamFetch,
    isApiError,
} from "@dcc-bs/communication.bs.js";
import { z } from "zod";
import type { ValidationResult } from "~/assets/models/advisor";
import {
    AdvisorDocumentDescriptionSchema,
    type AdvisorDocumentDescription,
    type FixThread,
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

export function useAdvisor() {
    const { t } = useI18n();

    const docs = ref<AdvisorDocumentDescription[]>([]);

    getDocs(t).then((x) => (docs.value = x));

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
    ): AsyncGenerator<ValidationResult, void, void> {
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
        let buffer = "";

        try {
            while (true) {
                const { value, done } = await reader.read();

                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                const { events, remaining } = extractEventsFromBuffer(buffer);
                buffer = remaining;

                for (const payload of events) {
                    yield payload;
                }
            }

            const { events } = extractEventsFromBuffer(buffer, true);
            for (const payload of events) {
                yield payload;
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
        let accumulated = "";

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                const { deltas, remaining } = extractTextDeltas(buffer);
                buffer = remaining;

                for (const delta of deltas) {
                    accumulated += delta;
                    yield accumulated;
                }
            }

            const { deltas } = extractTextDeltas(buffer, true);
            for (const delta of deltas) {
                accumulated += delta;
                yield accumulated;
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

function extractEventsFromBuffer(
    buffer: string,
    flush = false,
): { events: ValidationResult[]; remaining: string } {
    const events: ValidationResult[] = [];
    let remaining = buffer;

    while (true) {
        const separatorIndex = remaining.indexOf("\n\n");
        if (separatorIndex === -1) {
            break;
        }

        const rawEvent = remaining.slice(0, separatorIndex);
        remaining = remaining.slice(separatorIndex + 2);

        const payload = parseSseEvent(rawEvent);
        if (payload) {
            events.push(payload);
        }
    }

    if (flush && remaining.trim().length > 0) {
        const payload = parseSseEvent(remaining);
        if (payload) {
            events.push(payload);
        }
        remaining = "";
    }

    return { events, remaining };
}

function parseSseEvent(block: string): ValidationResult | undefined {
    const lines = block.replaceAll("\r", "").split("\n");

    for (const line of lines) {
        if (!line.startsWith("data:")) {
            continue;
        }

        const raw = line.slice(5).trim();
        if (!raw) {
            continue;
        }

        try {
            const parsed = JSON.parse(raw) as ValidationResult;
            parsed.rules ??= [];

            return {
                ...parsed,
                rules: parsed.rules.map((rule) => ({ ...rule })),
            };
        } catch {
            return undefined;
        }
    }

    return undefined;
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
