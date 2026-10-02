import { v7 as uuid } from "uuid";
import { db } from "~/assets/services/db";
import {
    type SavedPrompt,
    type SavedPromptInput,
    SavedPromptInputSchema,
} from "~/types/savedPrompt";
import type { ISavedPromptQuery } from "./savedPrompt.query.interface";

/**
 * Dexie-backed store for saved prompts. Pure I/O: errors propagate to the
 * caller (`useSavedPrompts`), which logs them and informs the user.
 */
export class SavedPromptQuery implements ISavedPromptQuery {
    static readonly $injectKey = "savedPromptQuery";
    static readonly $inject = [];

    /** Gets all prompts sorted by name with German collation. */
    async getAll(): Promise<SavedPrompt[]> {
        const prompts = await db.savedPrompts.toArray();
        return prompts.sort((a, b) => a.name.localeCompare(b.name, "de"));
    }

    /** Validates and stores a new prompt. */
    async add(input: SavedPromptInput): Promise<SavedPrompt> {
        const prompt = this.createPrompt(input, Date.now());
        await db.savedPrompts.add(prompt);
        return prompt;
    }

    /** Validates and updates the name and text of a stored prompt. */
    async update(id: string, input: SavedPromptInput): Promise<SavedPrompt> {
        const valid = SavedPromptInputSchema.parse(input);
        const existing = await db.savedPrompts.get(id);
        if (existing === undefined) {
            throw new Error(`Saved prompt not found: ${id}`);
        }

        const updated: SavedPrompt = {
            ...existing,
            name: valid.name,
            prompt: valid.prompt,
            updatedAt: Date.now(),
        };
        await db.savedPrompts.put(updated);
        return updated;
    }

    /** Deletes a prompt; unknown ids are a no-op. */
    async remove(id: string): Promise<void> {
        await db.savedPrompts.delete(id);
    }

    /** Validates all inputs first, then stores them in one transaction. */
    async addMany(inputs: readonly SavedPromptInput[]): Promise<number> {
        const now = Date.now();
        const prompts = inputs.map((input) => this.createPrompt(input, now));
        await db.savedPrompts.bulkAdd(prompts);
        return prompts.length;
    }

    /** Validates an input and turns it into a new stored record. */
    private createPrompt(input: SavedPromptInput, now: number): SavedPrompt {
        const valid = SavedPromptInputSchema.parse(input);
        return {
            id: uuid(),
            name: valid.name,
            prompt: valid.prompt,
            createdAt: now,
            updatedAt: now,
        };
    }
}
