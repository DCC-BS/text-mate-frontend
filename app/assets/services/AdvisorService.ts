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

    async validate(text: string, docs: string[]): Promise<ValidationResult> {
        return await $fetch<ValidationResult>("api/advisor/validate", {
            method: "POST",
            body: {
                text,
                docs,
            },
        });
    }
}
