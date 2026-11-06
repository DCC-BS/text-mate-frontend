import Dexie, { type EntityTable } from "dexie";
import type { SavedPrompt } from "~/types/savedPrompt";

/**
 * TextMate's local IndexedDB database. Add new tables with a new
 * `db.version(n)` block; never edit a released version.
 */
export const db = new Dexie("TextMateDB") as Dexie & {
    savedPrompts: EntityTable<SavedPrompt, "id">;
};

db.version(1).stores({
    savedPrompts: "id, name, updatedAt",
});
