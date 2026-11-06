// Must load before Dexie so Dexie picks up the in-memory IndexedDB.
import "fake-indexeddb/auto";
import { SavedPromptQuery } from "~/assets/queries/savedPrompt.query";
import { db } from "~/assets/services/db";

describe("SavedPromptQuery", () => {
    const query = new SavedPromptQuery();

    beforeEach(async () => {
        await db.savedPrompts.clear();
        vi.restoreAllMocks();
    });

    it("adds a prompt with id, timestamps and trimmed values", async () => {
        vi.spyOn(Date, "now").mockReturnValue(1000);

        const saved = await query.add({ name: " Medien ", prompt: " Kurz " });

        expect(saved).toEqual({
            id: expect.any(String),
            name: "Medien",
            prompt: "Kurz",
            createdAt: 1000,
            updatedAt: 1000,
        });
        expect(await db.savedPrompts.get(saved.id)).toEqual(saved);
    });

    it("rejects an invalid prompt", async () => {
        await expect(query.add({ name: "  ", prompt: "Kurz" })).rejects.toThrow();
        expect(await db.savedPrompts.count()).toBe(0);
    });

    it("returns all prompts sorted by German collation", async () => {
        await query.add({ name: "Zebra", prompt: "z" });
        await query.add({ name: "Ärger", prompt: "ä" });
        await query.add({ name: "Brief", prompt: "b" });

        const names = (await query.getAll()).map((p) => p.name);

        expect(names).toEqual(["Ärger", "Brief", "Zebra"]);
    });

    it("updates name, prompt and updatedAt but keeps createdAt", async () => {
        vi.spyOn(Date, "now").mockReturnValue(1000);
        const saved = await query.add({ name: "Alt", prompt: "alt" });
        vi.spyOn(Date, "now").mockReturnValue(2000);

        const updated = await query.update(saved.id, {
            name: "Neu",
            prompt: "neu",
        });

        expect(updated).toEqual({
            id: saved.id,
            name: "Neu",
            prompt: "neu",
            createdAt: 1000,
            updatedAt: 2000,
        });
        expect(await db.savedPrompts.get(saved.id)).toEqual(updated);
    });

    it("throws when updating a missing prompt", async () => {
        await expect(
            query.update("missing", { name: "A", prompt: "a" }),
        ).rejects.toThrow("missing");
    });

    it("removes a prompt and ignores missing ids", async () => {
        const saved = await query.add({ name: "A", prompt: "a" });

        await query.remove(saved.id);
        await query.remove("missing");

        expect(await db.savedPrompts.count()).toBe(0);
    });

    it("adds many prompts and returns the count", async () => {
        const count = await query.addMany([
            { name: "A", prompt: "a" },
            { name: "B", prompt: "b" },
        ]);

        expect(count).toBe(2);
        expect((await query.getAll()).map((p) => p.name)).toEqual(["A", "B"]);
    });

    it("stores nothing from addMany when one entry is invalid", async () => {
        await expect(
            query.addMany([
                { name: "A", prompt: "a" },
                { name: "", prompt: "b" },
            ]),
        ).rejects.toThrow();
        expect(await db.savedPrompts.count()).toBe(0);
    });
});
