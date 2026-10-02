import {
    SAVED_PROMPT_NAME_MAX_LENGTH,
    type SavedPrompt,
} from "~/types/savedPrompt";
import {
    buildExport,
    findNewPrompts,
    isValidSavedPromptInput,
    parseImport,
} from "~/utils/savedPromptTransfer";

/** Builds a stored prompt with fixed metadata for the tests. */
function storedPrompt(name: string, prompt: string): SavedPrompt {
    return { id: `id-${name}`, name, prompt, createdAt: 1, updatedAt: 1 };
}

describe("isValidSavedPromptInput", () => {
    it("accepts a normal name and prompt", () => {
        expect(isValidSavedPromptInput("Medien", "Kurz und klar")).toBe(true);
    });

    it("rejects a whitespace-only name", () => {
        expect(isValidSavedPromptInput("   ", "Kurz und klar")).toBe(false);
    });

    it("rejects a name longer than the limit after trimming", () => {
        const name = "a".repeat(SAVED_PROMPT_NAME_MAX_LENGTH + 1);
        expect(isValidSavedPromptInput(name, "Kurz und klar")).toBe(false);
    });

    it("accepts a name at the limit with surrounding spaces", () => {
        const name = ` ${"a".repeat(SAVED_PROMPT_NAME_MAX_LENGTH)} `;
        expect(isValidSavedPromptInput(name, "Kurz und klar")).toBe(true);
    });

    it("rejects an empty prompt", () => {
        expect(isValidSavedPromptInput("Medien", "  \n ")).toBe(false);
    });
});

describe("buildExport", () => {
    it("keeps only name and prompt", () => {
        const result = buildExport([storedPrompt("A", "Prompt A")]);
        expect(result).toEqual({
            version: 1,
            prompts: [{ name: "A", prompt: "Prompt A" }],
        });
    });
});

describe("parseImport", () => {
    it("accepts a valid file and trims values", () => {
        const text = JSON.stringify({
            version: 1,
            prompts: [{ name: " A ", prompt: " Prompt A " }],
        });
        expect(parseImport(text)).toEqual({
            ok: true,
            prompts: [{ name: "A", prompt: "Prompt A" }],
        });
    });

    it("ignores unknown extra fields", () => {
        const text = JSON.stringify({
            version: 1,
            prompts: [{ name: "A", prompt: "Prompt A", id: "x", color: "red" }],
        });
        expect(parseImport(text)).toEqual({
            ok: true,
            prompts: [{ name: "A", prompt: "Prompt A" }],
        });
    });

    it("rejects text that is not JSON", () => {
        expect(parseImport("not json")).toEqual({
            ok: false,
            error: "invalidJson",
        });
    });

    it("rejects an unknown version", () => {
        const text = JSON.stringify({ version: 2, prompts: [] });
        expect(parseImport(text)).toEqual({
            ok: false,
            error: "invalidFormat",
        });
    });

    it("rejects an entry without a prompt", () => {
        const text = JSON.stringify({ version: 1, prompts: [{ name: "A" }] });
        expect(parseImport(text)).toEqual({
            ok: false,
            error: "invalidFormat",
        });
    });

    it("rejects an entry with an empty name", () => {
        const text = JSON.stringify({
            version: 1,
            prompts: [{ name: " ", prompt: "Prompt A" }],
        });
        expect(parseImport(text)).toEqual({
            ok: false,
            error: "invalidFormat",
        });
    });

    it("rejects a JSON array", () => {
        expect(parseImport("[]")).toEqual({
            ok: false,
            error: "invalidFormat",
        });
    });
});

describe("findNewPrompts", () => {
    it("skips prompts that already exist", () => {
        const existing = [storedPrompt("A", "Prompt A")];
        const incoming = [
            { name: "A", prompt: "Prompt A" },
            { name: "B", prompt: "Prompt B" },
        ];
        expect(findNewPrompts(incoming, existing)).toEqual([
            { name: "B", prompt: "Prompt B" },
        ]);
    });

    it("keeps prompts that share a name but differ in text", () => {
        const existing = [storedPrompt("A", "Prompt A")];
        const incoming = [{ name: "A", prompt: "Other text" }];
        expect(findNewPrompts(incoming, existing)).toEqual(incoming);
    });

    it("keeps only the first of duplicates inside the file", () => {
        const incoming = [
            { name: "B", prompt: "Prompt B" },
            { name: "B", prompt: "Prompt B" },
        ];
        expect(findNewPrompts(incoming, [])).toEqual([
            { name: "B", prompt: "Prompt B" },
        ]);
    });
});
