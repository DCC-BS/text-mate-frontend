// Must load before Dexie so Dexie picks up the in-memory IndexedDB.
import "fake-indexeddb/auto";
import { readonly, ref } from "vue";

// `useSavedPrompts` relies on Nuxt auto-imports, which vitest does not provide.
vi.stubGlobal("ref", ref);
vi.stubGlobal("readonly", readonly);
vi.stubGlobal("useI18n", () => ({ t: (key: string) => key }));
vi.stubGlobal("useLogger", () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
}));
const toastAdd = vi.fn();
vi.stubGlobal("useToast", () => ({ add: toastAdd }));

type SavedPromptsApi = ReturnType<
    typeof import("~/composables/useSavedPrompts").useSavedPrompts
>;

/**
 * Loads a fresh copy of the composable (its state is module-level), backed by
 * an empty database or by the given fake query.
 */
async function setup(fakeQuery?: object): Promise<SavedPromptsApi> {
    vi.resetModules();
    const { db } = await import("~/assets/services/db");
    await db.savedPrompts.clear();
    const { SavedPromptQuery } = await import(
        "~/assets/queries/savedPrompt.query"
    );
    vi.stubGlobal("useService", () => fakeQuery ?? new SavedPromptQuery());
    const { useSavedPrompts } = await import("~/composables/useSavedPrompts");
    const api = useSavedPrompts();
    await api.load();
    return api;
}

/** Wraps JSON in a File like the import input delivers it. */
function jsonFile(content: string): File {
    return new File([content], "prompts.json", { type: "application/json" });
}

describe("useSavedPrompts", () => {
    beforeEach(() => {
        toastAdd.mockClear();
    });

    it("saves a prompt and lists it", async () => {
        const api = await setup();

        const ok = await api.save({ name: "Medien", prompt: "Kurz" });

        expect(ok).toBe(true);
        expect(api.prompts.value.map((p) => p.name)).toEqual(["Medien"]);
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                color: "success",
                title: "savedPrompts.toast.saved",
            }),
        );
    });

    it("reports an invalid prompt instead of throwing", async () => {
        const api = await setup();

        const ok = await api.save({ name: " ", prompt: "Kurz" });

        expect(ok).toBe(false);
        expect(api.prompts.value).toEqual([]);
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                color: "error",
                description: "savedPrompts.toast.error",
            }),
        );
    });

    it("updates and removes a prompt", async () => {
        const api = await setup();
        await api.save({ name: "Alt", prompt: "alt" });
        const id = api.prompts.value[0]?.id ?? "";

        await api.update(id, { name: "Neu", prompt: "neu" });
        expect(api.prompts.value.map((p) => p.name)).toEqual(["Neu"]);

        await api.remove(id);
        expect(api.prompts.value).toEqual([]);
    });

    it("keeps an empty list and shows an error when IndexedDB fails", async () => {
        const api = await setup({
            getAll: vi.fn().mockRejectedValue(new Error("blocked")),
        });

        expect(api.prompts.value).toEqual([]);
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                color: "error",
                description: "savedPrompts.toast.loadError",
            }),
        );
    });

    it("imports new prompts and skips duplicates", async () => {
        const api = await setup();
        await api.save({ name: "A", prompt: "Prompt A" });
        toastAdd.mockClear();
        const file = jsonFile(
            JSON.stringify({
                version: 1,
                prompts: [
                    { name: "A", prompt: "Prompt A" },
                    { name: "B", prompt: "Prompt B" },
                    { name: "B", prompt: "Prompt B" },
                ],
            }),
        );

        await api.importFromFile(file);

        expect(api.prompts.value.map((p) => p.name)).toEqual(["A", "B"]);
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                color: "success",
                title: "savedPrompts.toast.imported",
            }),
        );
    });

    it("rejects an oversized file without reading it", async () => {
        const api = await setup();
        const file = jsonFile("x".repeat(1024 * 1024 + 1));

        await api.importFromFile(file);

        expect(api.prompts.value).toEqual([]);
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                description: "savedPrompts.toast.importTooLarge",
            }),
        );
    });

    it("rejects a file that is not JSON", async () => {
        const api = await setup();

        await api.importFromFile(jsonFile("not json"));

        expect(api.prompts.value).toEqual([]);
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                description: "savedPrompts.toast.invalidJson",
            }),
        );
    });

    it("downloads nothing when there are no prompts to export", async () => {
        const api = await setup();
        const createObjectURL = vi.fn();
        URL.createObjectURL = createObjectURL;

        api.exportToJson();

        expect(createObjectURL).not.toHaveBeenCalled();
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({ title: "savedPrompts.toast.exportEmpty" }),
        );
    });

    it("downloads the export file when prompts exist", async () => {
        const api = await setup();
        await api.save({ name: "A", prompt: "Prompt A" });
        const createObjectURL = vi.fn(() => "blob:test");
        URL.createObjectURL = createObjectURL;
        URL.revokeObjectURL = vi.fn();

        api.exportToJson();

        expect(createObjectURL).toHaveBeenCalledOnce();
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "savedPrompts.toast.exported",
                description: "textmate-prompts.json",
            }),
        );
    });
});
