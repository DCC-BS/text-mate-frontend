import type {
    AdvidorDocumentDescription,
    ValidationResult,
} from "../models/advisor";

export async function getAdviorService() {
    const docs = await $fetch<AdvidorDocumentDescription[]>("api/advisor/docs");
    return new AdivsorService(docs);
}

export class AdivsorService {
    constructor(private readonly docs: AdvidorDocumentDescription[]) {}

    getDocs(): AdvidorDocumentDescription[] {
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
