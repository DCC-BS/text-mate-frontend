import { apiStreamFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type {
    AdvisorDocumentDescription,
    ValidationResult,
} from "../models/advisor";

export class AdvisorService {
    static readonly $injectKey = "advisorService";
    static readonly $inject = [];

    constructor(private readonly docs: AdvisorDocumentDescription[]) {}

    getDocs(): AdvisorDocumentDescription[] {
        return this.docs;
    }

    async getDocFile(name: string): Promise<Blob> {
        if (!this.docs.some((d) => d.file === name)) {
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
    async *validate(
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

                const { events, remaining } =
                    this.extractEventsFromBuffer(buffer);
                buffer = remaining;

                for (const payload of events) {
                    yield payload;
                }
            }

            const { events } = this.extractEventsFromBuffer(buffer, true);
            for (const payload of events) {
                yield payload;
            }
        } finally {
            reader.releaseLock();
        }
    }

    private extractEventsFromBuffer(
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

            const payload = this.parseSseEvent(rawEvent);
            if (payload) {
                events.push(payload);
            }
        }

        if (flush && remaining.trim().length > 0) {
            const payload = this.parseSseEvent(remaining);
            if (payload) {
                events.push(payload);
            }
            remaining = "";
        }

        return { events, remaining };
    }

    private parseSseEvent(block: string): ValidationResult | undefined {
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
}
