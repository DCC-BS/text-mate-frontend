# Saved Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let TextMate users save custom rewrite instructions as named prompts in the browser (IndexedDB via Dexie), apply them from "Meine Aktionen", manage them (edit, delete, export, import) on desktop and mobile, and ship it as version 1.8.0 with a tour step and changelog.

**Architecture:** A Dexie database (`app/assets/services/db.ts`) backs a DI-registered `SavedPromptQuery` (pure I/O). The singleton composable `useSavedPrompts` adds reactive state, toasts, logging and JSON export/import (pure helpers in `app/utils/savedPromptTransfer.ts`). Three components in `app/components/saved-prompt/` plug into the existing desktop (`UserActions.vue`, `CustomAction.vue`) and mobile (`useMobileActions.ts`, `MobileTransformTab.vue`, `CustomSheet.vue`) flows. A saved prompt runs through the existing `custom` quick action, so the backend does not change.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, Nuxt UI 4, Tailwind, Zod 4, Dexie 4, `@dcc-bs/dependency-injection.bs.js`, Vitest + happy-dom + fake-indexeddb, Playwright, Bun.

**Spec:** `docs/superpowers/specs/2026-10-02-saved-prompts-design.md`

## Global Constraints

- Work on branch `feat/saved-prompts` in `text-mate-frontend`.
- Use the Bun version pinned in `mise.toml` (1.4.x), e.g. `mise exec -- bun ...` or a bun ≥ 1.4 on PATH. Bun 1.3 re-resolves the whole `bun.lock` on any `package.json` change.
- Follow `AGENTS.md` and https://dcc-bs.github.io/documentation/coding/nuxt.html: `<script setup lang="ts">`, function declarations (no top-level arrow functions), explicit parameter and return types, no `any`, `undefined` over `null`, semicolons, 4-space indent, double quotes, a comment on every function/component, `~/`, `~~/`, `#shared` aliases instead of deep relative paths.
- Only Nuxt UI components and standard Tailwind classes. Icons are Lucide `i-lucide-*`. No custom CSS.
- File names: components PascalCase, other TS files camelCase. Queries keep the `.query.ts` / `.query.interface.ts` suffix.
- Name rule: trimmed, 1 to 80 characters. Prompt rule: trimmed, non-empty.
- Import files over 1 MB (1 048 576 bytes) are rejected before parsing.
- Export file name: `textmate-prompts.json`. Format: `{ "version": 1, "prompts": [{ "name", "prompt" }] }`.
- IndexedDB database `TextMateDB`, table `savedPrompts`, schema `"id, name, updatedAt"`, Dexie `version(1)`.
- Ids are uuid v7 (`import { v7 as uuid } from "uuid"`), as in `useAdvisor.ts`.
- Every new user-facing string goes into both `i18n/locales/de.json` and `i18n/locales/en.json`. German copy uses Swiss spelling ("ss", not "ß").
- The mobile drawer is labelled "Weitere Aktionen" (`actions.more`).
- Before every commit: `bun run check` (Biome) must leave no diff and `bunx biome ci .` must pass.

## Review Focus

1. An import file whose entries duplicate each other, or duplicate stored prompts, stores each prompt once and reports the rest as skipped. (Task 2 helper test, Task 4 composable test.)
2. A whitespace-only name, an 81-character name or an empty prompt is rejected everywhere: save buttons stay disabled, and the query throws if called anyway. (Task 2 schema tests, Task 3 query test.)
3. With an empty editor, users can still open "Prompts verwalten" on desktop and mobile and create prompts, while applying stays disabled. (Task 5 and Task 6 e2e.)
4. If IndexedDB is unavailable or blocked, the user gets an error toast, the list stays empty and the rest of the app keeps working. (Task 4 composable test.)
5. Editing or deleting in the manager updates "Meine Aktionen" and the mobile list immediately, because both read the same singleton state. (Task 5 e2e.)

---

### Task 1: Remove dead user dictionary and tour copy

Nothing renders `UserDictionary.vue` or `OnboardingView.vue`. The live tour is `app/composables/useOnboarding.ts`.

**Files:**
- Delete: `app/components/tool-panel/UserDictionary.vue`
- Delete: `app/assets/queries/user_dictionary.query.ts`
- Delete: `app/assets/queries/user_dictionary.query.interface.ts`
- Delete: `app/components/OnboardingView.vue`
- Modify: `app/plugins/serviceRegistrant.ts`
- Modify: `i18n/locales/de.json`, `i18n/locales/en.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `serviceRegistrant.ts` with only the `translate` and `logger` instances registered. Task 3 adds `SavedPromptQuery` here.

- [ ] **Step 1: Confirm nothing references the dead code**

Run:
```bash
grep -rn "UserDictionary\|user_dictionary\|OnboardingView\|user-dictionary\|addWordToDictionary" app server shared tests
```
Expected: matches only inside the four files to delete and in `serviceRegistrant.ts`. If anything else matches, stop and report it.

- [ ] **Step 2: Delete the files**

```bash
git rm app/components/tool-panel/UserDictionary.vue app/assets/queries/user_dictionary.query.ts app/assets/queries/user_dictionary.query.interface.ts app/components/OnboardingView.vue
```

- [ ] **Step 3: Remove the registration**

Replace the whole content of `app/plugins/serviceRegistrant.ts` with:

```ts
export default defineNuxtPlugin((nuxtApp) => {
    const orchestrator = new ServiceOrchestrator();

    // the setup will be lazily called the first time a
    // service is resolved, ensuring services are created
    // in the Vue component lifecycle or setup context.
    orchestrator.setup((builder) => {
        const logger = useLogger();
        const { t } = useI18n(); // this needs to be created in the setup context

        builder.registerInstance("translate", t);
        builder.registerInstance("logger", logger);
    });

    nuxtApp.provide("serviceOrchestrator", orchestrator);
});
```

- [ ] **Step 4: Remove the unused i18n keys**

In both `i18n/locales/de.json` and `i18n/locales/en.json`:
- delete the whole top-level `"user-dictionary": { ... }` object;
- delete the `"addWordToDictionary"` entry inside `"text-editor"` (keep the other `text-editor` keys, `WorkspaceEditor.vue` uses them).

Then run `bun run check` to fix trailing commas and formatting.

- [ ] **Step 5: Verify**

Run:
```bash
AUTH_MODE=none APP_MODE=ci bunx nuxt build && bunx biome ci . && APP_MODE=ci bunx vitest run
```
Expected: build exit 0 (vue-tsc runs inside the build), Biome clean, `Tests 173 passed`.

- [ ] **Step 6: Commit**

```bash
git add -A app/plugins/serviceRegistrant.ts i18n/locales
git commit -m "chore: remove dead user dictionary and duplicate onboarding tour"
```

---

### Task 2: Saved prompt types and transfer helpers

**Files:**
- Create: `app/types/savedPrompt.ts`
- Create: `app/utils/savedPromptTransfer.ts`
- Test: `tests/assets/utils/savedPromptTransfer.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SAVED_PROMPT_NAME_MAX_LENGTH: 80`
  - `SavedPromptInputSchema` (Zod), `type SavedPromptInput = { name: string; prompt: string }` (trimmed output)
  - `SavedPromptExportSchema` (Zod), `type SavedPromptExport = { version: 1; prompts: SavedPromptInput[] }`
  - `interface SavedPrompt extends SavedPromptInput { id: string; createdAt: number; updatedAt: number }`
  - `isValidSavedPromptInput(name: string, prompt: string): boolean`
  - `MAX_IMPORT_BYTES: 1048576`, `EXPORT_FILE_NAME: "textmate-prompts.json"`
  - `type ImportError = "invalidJson" | "invalidFormat"`
  - `type ImportResult = { ok: true; prompts: SavedPromptInput[] } | { ok: false; error: ImportError }`
  - `buildExport(prompts: readonly SavedPrompt[]): SavedPromptExport`
  - `parseImport(text: string): ImportResult`
  - `findNewPrompts(incoming: readonly SavedPromptInput[], existing: readonly SavedPromptInput[]): SavedPromptInput[]`

- [ ] **Step 1: Write the failing test**

Create `tests/assets/utils/savedPromptTransfer.test.ts`:

```ts
import {
    isValidSavedPromptInput,
    SAVED_PROMPT_NAME_MAX_LENGTH,
    type SavedPrompt,
} from "~/types/savedPrompt";
import {
    buildExport,
    findNewPrompts,
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `APP_MODE=ci bunx vitest run tests/assets/utils/savedPromptTransfer.test.ts`
Expected: FAIL, cannot resolve `~/types/savedPrompt`.

- [ ] **Step 3: Write the types**

Create `app/types/savedPrompt.ts`:

```ts
import * as z from "zod";

/** Maximum length of a saved prompt's name, after trimming. */
export const SAVED_PROMPT_NAME_MAX_LENGTH = 80;

/** User-editable fields of a saved prompt. Trims both values. */
export const SavedPromptInputSchema = z.object({
    name: z.string().trim().min(1).max(SAVED_PROMPT_NAME_MAX_LENGTH),
    prompt: z.string().trim().min(1),
});

export type SavedPromptInput = z.output<typeof SavedPromptInputSchema>;

/** Shape of an exported prompts file (`textmate-prompts.json`). */
export const SavedPromptExportSchema = z.object({
    version: z.literal(1),
    prompts: z.array(SavedPromptInputSchema),
});

export type SavedPromptExport = z.output<typeof SavedPromptExportSchema>;

/** A prompt the user saved in this browser. */
export interface SavedPrompt extends SavedPromptInput {
    /** uuid v7 */
    id: string;
    /** Epoch milliseconds. */
    createdAt: number;
    /** Epoch milliseconds. */
    updatedAt: number;
}

/**
 * Checks a name and prompt against the save rules, so forms can disable
 * their save button before calling the store.
 */
export function isValidSavedPromptInput(name: string, prompt: string): boolean {
    return SavedPromptInputSchema.safeParse({ name, prompt }).success;
}
```

- [ ] **Step 4: Write the transfer helpers**

Create `app/utils/savedPromptTransfer.ts`:

```ts
import {
    type SavedPrompt,
    type SavedPromptExport,
    SavedPromptExportSchema,
    type SavedPromptInput,
} from "~/types/savedPrompt";

/** Largest import file accepted (1 MB). */
export const MAX_IMPORT_BYTES = 1024 * 1024;

/** File name used when exporting saved prompts. */
export const EXPORT_FILE_NAME = "textmate-prompts.json";

/** Why an import file was rejected. Also the i18n key suffix of the error toast. */
export type ImportError = "invalidJson" | "invalidFormat";

/** Result of parsing an import file. */
export type ImportResult =
    | { ok: true; prompts: SavedPromptInput[] }
    | { ok: false; error: ImportError };

/**
 * Builds the export file content. Ids and timestamps are local details and
 * are left out.
 */
export function buildExport(
    prompts: readonly SavedPrompt[],
): SavedPromptExport {
    return {
        version: 1,
        prompts: prompts.map((prompt) => ({
            name: prompt.name,
            prompt: prompt.prompt,
        })),
    };
}

/** Parses and validates the text of an import file. */
export function parseImport(text: string): ImportResult {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return { ok: false, error: "invalidJson" };
    }

    const parsed = SavedPromptExportSchema.safeParse(data);
    if (!parsed.success) {
        return { ok: false, error: "invalidFormat" };
    }
    return { ok: true, prompts: parsed.data.prompts };
}

/** Identity of a prompt for duplicate detection: exact name and text. */
function promptKey(prompt: SavedPromptInput): string {
    return JSON.stringify([prompt.name, prompt.prompt]);
}

/**
 * Returns the incoming prompts that are not stored yet, dropping repeats
 * inside the incoming list as well.
 */
export function findNewPrompts(
    incoming: readonly SavedPromptInput[],
    existing: readonly SavedPromptInput[],
): SavedPromptInput[] {
    const seen = new Set(existing.map(promptKey));
    const fresh: SavedPromptInput[] = [];
    for (const prompt of incoming) {
        const key = promptKey(prompt);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        fresh.push(prompt);
    }
    return fresh;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `APP_MODE=ci bunx vitest run tests/assets/utils/savedPromptTransfer.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 6: Commit**

```bash
bun run check
git add app/types/savedPrompt.ts app/utils/savedPromptTransfer.ts tests/assets/utils/savedPromptTransfer.test.ts
git commit -m "feat(saved-prompts): add types and export/import helpers"
```

---

### Task 3: Dexie database and SavedPromptQuery

**Files:**
- Modify: `package.json`, `bun.lock` (add `dexie`, dev `fake-indexeddb`)
- Create: `app/assets/services/db.ts`
- Create: `app/assets/queries/savedPrompt.query.interface.ts`
- Create: `app/assets/queries/savedPrompt.query.ts`
- Modify: `app/plugins/serviceRegistrant.ts`
- Test: `tests/assets/queries/savedPrompt.query.test.ts`

**Interfaces:**
- Consumes: `SavedPrompt`, `SavedPromptInput`, `SavedPromptInputSchema` from Task 2.
- Produces:
  - `db: Dexie & { savedPrompts: EntityTable<SavedPrompt, "id"> }` from `~/assets/services/db`
  - `class SavedPromptQuery implements ISavedPromptQuery` with `static $injectKey = "savedPromptQuery"`, `static $inject = []` and:
    - `getAll(): Promise<SavedPrompt[]>` sorted by `name` with `localeCompare(…, "de")`
    - `add(input: SavedPromptInput): Promise<SavedPrompt>`
    - `update(id: string, input: SavedPromptInput): Promise<SavedPrompt>` (throws if missing)
    - `remove(id: string): Promise<void>`
    - `addMany(inputs: readonly SavedPromptInput[]): Promise<number>`
  - All methods reject with a `ZodError` on invalid input.

- [ ] **Step 1: Add the dependencies**

```bash
bun add dexie@^4
bun add -d fake-indexeddb
```
Expected: `package.json` gains `"dexie"` in `dependencies` and `"fake-indexeddb"` in `devDependencies`. The `bun.lock` diff stays small (only these packages). If it rewrites hundreds of lines, your Bun is older than 1.4. Reset `bun.lock` and use the pinned version.

- [ ] **Step 2: Write the failing test**

Create `tests/assets/queries/savedPrompt.query.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `APP_MODE=ci bunx vitest run tests/assets/queries/savedPrompt.query.test.ts`
Expected: FAIL, cannot resolve `~/assets/queries/savedPrompt.query`.

- [ ] **Step 4: Create the database module**

Create `app/assets/services/db.ts`:

```ts
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
```

- [ ] **Step 5: Create the interface**

Create `app/assets/queries/savedPrompt.query.interface.ts`:

```ts
import type { SavedPrompt, SavedPromptInput } from "~/types/savedPrompt";

/**
 * Storage operations for prompts the user saved in this browser.
 * Every method rejects with a ZodError when the input breaks the save rules.
 */
export interface ISavedPromptQuery {
    /**
     * Gets all saved prompts sorted by name.
     * @returns Promise with the prompts
     */
    getAll: () => Promise<SavedPrompt[]>;

    /**
     * Saves a new prompt.
     * @param input - Name and instruction text
     * @returns Promise with the stored prompt
     */
    add: (input: SavedPromptInput) => Promise<SavedPrompt>;

    /**
     * Updates the name and text of a stored prompt.
     * @param id - Id of the prompt to update
     * @param input - New name and instruction text
     * @returns Promise with the updated prompt; rejects if the id is unknown
     */
    update: (id: string, input: SavedPromptInput) => Promise<SavedPrompt>;

    /**
     * Deletes a prompt. Unknown ids are ignored.
     * @param id - Id of the prompt to delete
     */
    remove: (id: string) => Promise<void>;

    /**
     * Saves several prompts in one transaction (used by import).
     * @param inputs - Names and instruction texts
     * @returns Promise with the number of stored prompts
     */
    addMany: (inputs: readonly SavedPromptInput[]) => Promise<number>;
}
```

- [ ] **Step 6: Create the query class**

Create `app/assets/queries/savedPrompt.query.ts`:

```ts
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
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `APP_MODE=ci bunx vitest run tests/assets/queries/savedPrompt.query.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 8: Register the query**

In `app/plugins/serviceRegistrant.ts` add the import at the top and the registration after the two `registerInstance` lines:

```ts
import { SavedPromptQuery } from "~/assets/queries/savedPrompt.query";
```

```ts
        builder.register(SavedPromptQuery);
```

- [ ] **Step 9: Verify the build (SSR must not touch IndexedDB)**

Run: `AUTH_MODE=none APP_MODE=ci bunx nuxt build`
Expected: exit 0. Nothing calls Dexie during server rendering, because loading only starts in `onMounted` (Task 4 onwards).

- [ ] **Step 10: Commit**

```bash
bun run check
git add package.json bun.lock app/assets/services/db.ts app/assets/queries/savedPrompt.query.interface.ts app/assets/queries/savedPrompt.query.ts app/plugins/serviceRegistrant.ts tests/assets/queries/savedPrompt.query.test.ts
git commit -m "feat(saved-prompts): add Dexie database and SavedPromptQuery"
```

---

### Task 4: useSavedPrompts composable and i18n strings

**Files:**
- Create: `app/composables/useSavedPrompts.ts`
- Modify: `i18n/locales/de.json`, `i18n/locales/en.json`
- Test: `tests/assets/composables/useSavedPrompts.test.ts`

**Interfaces:**
- Consumes: `SavedPromptQuery` (Task 3), `buildExport`, `parseImport`, `findNewPrompts`, `MAX_IMPORT_BYTES`, `EXPORT_FILE_NAME` (Task 2). Nuxt auto-imports `useI18n`, `useToast`, `useLogger`, `useService`, `ref`, `readonly`.
- Produces: `useSavedPrompts()` returning
  - `prompts: Readonly<Ref<readonly SavedPrompt[]>>` (module-level singleton)
  - `load(): Promise<void>` (idempotent; call it from `onMounted`)
  - `save(input: SavedPromptInput): Promise<boolean>`
  - `update(id: string, input: SavedPromptInput): Promise<boolean>`
  - `remove(id: string): Promise<boolean>`
  - `exportToJson(): void`
  - `importFromFile(file: File): Promise<void>`
  - i18n keys under `savedPrompts.*` (listed in Step 3) used by Tasks 5 and 6.

- [ ] **Step 1: Write the failing test**

Create `tests/assets/composables/useSavedPrompts.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `APP_MODE=ci bunx vitest run tests/assets/composables/useSavedPrompts.test.ts`
Expected: FAIL, cannot resolve `~/composables/useSavedPrompts`.

- [ ] **Step 3: Add the i18n strings**

Add a top-level `"savedPrompts"` object to `i18n/locales/de.json` (after `"quick-actions"`):

```json
    "savedPrompts": {
        "saveAsPrompt": "Als Prompt speichern",
        "namePlaceholder": "Name des Prompts",
        "promptPlaceholder": "Anweisung eingeben...",
        "save": "Speichern",
        "local": "Lokal",
        "localTooltip": "Nur in diesem Browser gespeichert",
        "manage": "Prompts verwalten…",
        "managerTitle": "Gespeicherte Prompts",
        "new": "Neuer Prompt",
        "export": "Exportieren",
        "import": "Importieren",
        "empty": "Noch keine Prompts gespeichert. Speichere eine benutzerdefinierte Anweisung mit «Als Prompt speichern» oder lege hier einen neuen Prompt an.",
        "confirmDelete": "Wirklich löschen?",
        "toast": {
            "saved": "Prompt gespeichert",
            "updated": "Prompt aktualisiert",
            "deleted": "Prompt gelöscht",
            "exported": "Prompts exportiert",
            "exportEmpty": "Keine Prompts zum Exportieren",
            "imported": "Import abgeschlossen",
            "importedDetail": "{added} hinzugefügt, {skipped} übersprungen",
            "importTooLarge": "Die Datei ist zu gross (maximal 1 MB).",
            "invalidJson": "Die Datei enthält kein gültiges JSON.",
            "invalidFormat": "Die Datei hat nicht das erwartete Format.",
            "error": "Die Änderung konnte nicht gespeichert werden.",
            "loadError": "Gespeicherte Prompts konnten nicht geladen werden."
        }
    },
```

And the same keys in `i18n/locales/en.json`:

```json
    "savedPrompts": {
        "saveAsPrompt": "Save as prompt",
        "namePlaceholder": "Prompt name",
        "promptPlaceholder": "Enter instruction...",
        "save": "Save",
        "local": "Local",
        "localTooltip": "Stored only in this browser",
        "manage": "Manage prompts…",
        "managerTitle": "Saved prompts",
        "new": "New prompt",
        "export": "Export",
        "import": "Import",
        "empty": "No prompts saved yet. Save a custom instruction with \"Save as prompt\" or create a new prompt here.",
        "confirmDelete": "Really delete?",
        "toast": {
            "saved": "Prompt saved",
            "updated": "Prompt updated",
            "deleted": "Prompt deleted",
            "exported": "Prompts exported",
            "exportEmpty": "No prompts to export",
            "imported": "Import finished",
            "importedDetail": "{added} added, {skipped} skipped",
            "importTooLarge": "The file is too large (maximum 1 MB).",
            "invalidJson": "The file does not contain valid JSON.",
            "invalidFormat": "The file does not have the expected format.",
            "error": "The change could not be saved.",
            "loadError": "Saved prompts could not be loaded."
        }
    },
```

- [ ] **Step 4: Write the composable**

Create `app/composables/useSavedPrompts.ts`:

```ts
import { SavedPromptQuery } from "~/assets/queries/savedPrompt.query";
import type { SavedPrompt, SavedPromptInput } from "~/types/savedPrompt";
import {
    buildExport,
    EXPORT_FILE_NAME,
    findNewPrompts,
    MAX_IMPORT_BYTES,
    parseImport,
} from "~/utils/savedPromptTransfer";

// Module-level singleton state: the desktop and mobile ribbons share one list.
const prompts = ref<SavedPrompt[]>([]);
// The initial load, kept so IndexedDB is read once per page.
let loading: Promise<void> | undefined;

/**
 * Prompts the user saved in this browser ("Benutzerdefinierte Prompts").
 * Wraps `SavedPromptQuery` with reactive state, toasts, logging and JSON
 * export/import. Call `load()` from `onMounted`, never during SSR.
 */
export function useSavedPrompts() {
    const { t } = useI18n();
    const toast = useToast();
    const logger = useLogger();
    const query = useService(SavedPromptQuery);

    /** Shows a success toast. */
    function notifySuccess(title: string, description?: string): void {
        toast.add({
            title,
            description,
            color: "success",
            icon: "i-lucide-circle-check",
            duration: 3000,
        });
    }

    /** Shows an error toast. */
    function notifyError(description: string): void {
        toast.add({
            title: t("errors.title"),
            description,
            color: "error",
            icon: "i-lucide-circle-alert",
        });
    }

    /** Reads the current list from IndexedDB. */
    async function reload(): Promise<void> {
        prompts.value = await query.getAll();
    }

    /** Loads the list once; later calls reuse the first load. */
    function load(): Promise<void> {
        if (loading === undefined) {
            loading = reload().catch((error: unknown) => {
                logger.error(error, "Failed to load saved prompts");
                notifyError(t("savedPrompts.toast.loadError"));
                // Allow a later retry.
                loading = undefined;
            });
        }
        return loading;
    }

    /**
     * Runs a write, reloads the list and toasts the outcome.
     * @returns true when the write succeeded
     */
    async function write(
        operation: () => Promise<unknown>,
        successKey: string,
        logMessage: string,
    ): Promise<boolean> {
        try {
            await operation();
            await reload();
            notifySuccess(t(successKey));
            return true;
        } catch (error: unknown) {
            logger.error(error, logMessage);
            notifyError(t("savedPrompts.toast.error"));
            return false;
        }
    }

    /** Saves a new prompt. */
    function save(input: SavedPromptInput): Promise<boolean> {
        return write(
            () => query.add(input),
            "savedPrompts.toast.saved",
            "Failed to save prompt",
        );
    }

    /** Updates the name and text of a prompt. */
    function update(id: string, input: SavedPromptInput): Promise<boolean> {
        return write(
            () => query.update(id, input),
            "savedPrompts.toast.updated",
            "Failed to update prompt",
        );
    }

    /** Deletes a prompt. */
    function remove(id: string): Promise<boolean> {
        return write(
            () => query.remove(id),
            "savedPrompts.toast.deleted",
            "Failed to delete prompt",
        );
    }

    /** Downloads all prompts as `textmate-prompts.json`. */
    function exportToJson(): void {
        if (prompts.value.length === 0) {
            toast.add({
                title: t("savedPrompts.toast.exportEmpty"),
                color: "info",
                icon: "i-lucide-info",
                duration: 3000,
            });
            return;
        }

        const json = JSON.stringify(buildExport(prompts.value), null, 4);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = EXPORT_FILE_NAME;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        notifySuccess(t("savedPrompts.toast.exported"), EXPORT_FILE_NAME);
    }

    /** Imports prompts from an exported file, skipping exact duplicates. */
    async function importFromFile(file: File): Promise<void> {
        if (file.size > MAX_IMPORT_BYTES) {
            notifyError(t("savedPrompts.toast.importTooLarge"));
            return;
        }

        const result = parseImport(await file.text());
        if (!result.ok) {
            notifyError(t(`savedPrompts.toast.${result.error}`));
            return;
        }

        // Compare against the stored list, not a list that has not loaded yet.
        await load();
        const fresh = findNewPrompts(result.prompts, prompts.value);

        try {
            const added = fresh.length > 0 ? await query.addMany(fresh) : 0;
            await reload();
            notifySuccess(
                t("savedPrompts.toast.imported"),
                t("savedPrompts.toast.importedDetail", {
                    added,
                    skipped: result.prompts.length - added,
                }),
            );
        } catch (error: unknown) {
            logger.error(error, "Failed to import prompts");
            notifyError(t("savedPrompts.toast.error"));
        }
    }

    return {
        prompts: readonly(prompts),
        load,
        save,
        update,
        remove,
        exportToJson,
        importFromFile,
    };
}
```

The test stub `t` ignores its second argument, so `importedDetail` resolves to its key in tests.

- [ ] **Step 5: Run the test to verify it passes**

Run: `APP_MODE=ci bunx vitest run tests/assets/composables/useSavedPrompts.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Run all checks**

Run: `AUTH_MODE=none APP_MODE=ci bunx nuxt build && bunx biome ci . && APP_MODE=ci bunx vitest run`
Expected: build exit 0, Biome clean, all unit tests pass.

- [ ] **Step 7: Commit**

```bash
bun run check
git add app/composables/useSavedPrompts.ts i18n/locales/de.json i18n/locales/en.json tests/assets/composables/useSavedPrompts.test.ts
git commit -m "feat(saved-prompts): add useSavedPrompts composable"
```

---

### Task 5: Saved prompt components and desktop integration

**Files:**
- Create: `app/components/saved-prompt/SavedPromptForm.vue`
- Create: `app/components/saved-prompt/SavedPromptSaveInline.vue`
- Create: `app/components/saved-prompt/SavedPromptManager.vue`
- Modify: `app/components/rewrite/quick-action/UserActions.vue` (full rewrite below)
- Modify: `app/components/rewrite/quick-action/CustomAction.vue`
- Test: `tests/e2e/savedPrompts.spec.ts`

**Interfaces:**
- Consumes: `useSavedPrompts()` (Task 4), `isValidSavedPromptInput`, `SAVED_PROMPT_NAME_MAX_LENGTH`, `SavedPrompt` (Task 2), i18n `savedPrompts.*`, `common.cancel|edit|delete`, `actions.apply`, `editor.userActions`.
- Produces (auto-imported components, used by Task 6):
  - `<SavedPromptSaveInline :prompt="string" />`
  - `<SavedPromptManager :actions-are-available="boolean" @apply="(prompt: string) => void" />`
  - `<SavedPromptForm v-model:name v-model:prompt :valid @submit @cancel />`
  - `data-tour="user-actions"` on the "Meine Aktionen" button (Task 7 tour target)
  - test ids: `savePromptToggle`, `savePromptName`, `savePromptSubmit`, `userActionsMenu`, `savedPromptManager`, `savedPromptNew`, `savedPromptExport`, `savedPromptImportInput`, `savedPromptRow`, `savedPromptApply`, `savedPromptEdit`, `savedPromptDelete`, `savedPromptConfirmDelete`, `savedPromptFormName`, `savedPromptFormPrompt`, `savedPromptFormSave`

- [ ] **Step 1: Write the failing e2e test**

Create `tests/e2e/savedPrompts.spec.ts`:

```ts
import { expect, type Page, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };
import { switchTo } from "./utils";

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".tiptap")).toBeVisible();
    await switchTo(page, "rewrite");
});

/** Saves an instruction under a name through the custom instructions drawer. */
async function saveFromCustomDrawer(
    page: Page,
    name: string,
    prompt: string,
): Promise<void> {
    await page
        .getByRole("button", { name: local.actions.custom, exact: true })
        .click();
    await page.getByTestId("customActionTextBox").fill(prompt);
    await page.getByTestId("savePromptToggle").click();
    await page.getByTestId("savePromptName").fill(name);
    await page.getByTestId("savePromptSubmit").click();
    await expect(
        page.getByText(local.savedPrompts.toast.saved).first(),
    ).toBeVisible();
    await page.keyboard.press("Escape");
}

/** Opens the saved prompt manager from the "Meine Aktionen" menu. */
async function openManager(page: Page): Promise<void> {
    await page.getByTestId("userActionsMenu").click();
    await page
        .getByRole("menuitem", { name: local.savedPrompts.manage })
        .click();
    await expect(page.getByTestId("savedPromptManager")).toBeVisible();
}

test("Saved prompt is applied from Meine Aktionen", async ({ page }) => {
    await page.locator(".tiptap").fill("This is a test.");
    await saveFromCustomDrawer(page, "Spass", "Make it fun!");

    await page.getByTestId("userActionsMenu").click();
    const item = page.getByRole("menuitem", { name: /Spass/ });
    await expect(item).toContainText(local.savedPrompts.local);
    await item.click();

    const diffReview = page.locator('[data-tour="diff-review"]');
    await expect(diffReview).toBeVisible();
    await expect(diffReview).toContainText("Action: custom");
    await expect(diffReview).toContainText("Options: Make it fun!");
});

test("Saved prompt is edited and deleted in the manager", async ({ page }) => {
    await page.locator(".tiptap").fill("This is a test.");
    await saveFromCustomDrawer(page, "Alt", "Old text");
    await openManager(page);

    const row = page.getByTestId("savedPromptRow").filter({ hasText: "Alt" });
    await row.getByTestId("savedPromptEdit").click();
    await page.getByTestId("savedPromptFormName").fill("Neu");
    await page.getByTestId("savedPromptFormSave").click();
    await expect(
        page.getByTestId("savedPromptRow").filter({ hasText: "Neu" }),
    ).toBeVisible();

    await page.getByTestId("savedPromptDelete").click();
    await page.getByTestId("savedPromptConfirmDelete").click();
    await expect(page.getByText(local.savedPrompts.empty)).toBeVisible();

    await page.keyboard.press("Escape");
    await page.getByTestId("userActionsMenu").click();
    await expect(page.getByRole("menuitem", { name: /Neu/ })).toHaveCount(0);
});

test("Prompts can be managed with an empty editor", async ({ page }) => {
    await openManager(page);

    await page.getByTestId("savedPromptNew").click();
    await page.getByTestId("savedPromptFormName").fill("Ohne Text");
    await page.getByTestId("savedPromptFormPrompt").fill("Some instruction");
    await page.getByTestId("savedPromptFormSave").click();

    const row = page
        .getByTestId("savedPromptRow")
        .filter({ hasText: "Ohne Text" });
    await expect(row).toBeVisible();
    await expect(row.getByTestId("savedPromptApply")).toBeDisabled();
});

test("Exported prompts can be imported again", async ({ page }, testInfo) => {
    await page.locator(".tiptap").fill("This is a test.");
    await saveFromCustomDrawer(page, "Export", "Export me");
    await openManager(page);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("savedPromptExport").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("textmate-prompts.json");
    const file = testInfo.outputPath("textmate-prompts.json");
    await download.saveAs(file);

    await page.getByTestId("savedPromptDelete").click();
    await page.getByTestId("savedPromptConfirmDelete").click();
    await expect(page.getByText(local.savedPrompts.empty)).toBeVisible();

    await page.getByTestId("savedPromptImportInput").setInputFiles(file);
    await expect(
        page.getByTestId("savedPromptRow").filter({ hasText: "Export" }),
    ).toBeVisible();
    await expect(page.getByText("1 hinzugefügt, 0 übersprungen")).toBeVisible();
});

test("An invalid import file shows an error", async ({ page }) => {
    await openManager(page);

    await page.getByTestId("savedPromptImportInput").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from("not json"),
    });

    await expect(
        page.getByText(local.savedPrompts.toast.invalidJson),
    ).toBeVisible();
});
```

- [ ] **Step 2: Run the e2e test to verify it fails**

Run: `mise run test:e2e -- tests/e2e/savedPrompts.spec.ts` (or, without mise: `AUTH_MODE=none APP_MODE=ci DUMMY=true bunx nuxt build && APP_MODE=ci bunx playwright test tests/e2e/savedPrompts.spec.ts`)
Expected: FAIL, `getByTestId('savePromptToggle')` / `userActionsMenu` not found.

- [ ] **Step 3: Create SavedPromptForm.vue**

Create `app/components/saved-prompt/SavedPromptForm.vue`:

```vue
<script setup lang="ts">
/**
 * Name and instruction form for creating or editing a saved prompt.
 * The parent owns the values (v-model) and decides what "submit" does.
 */
import { SAVED_PROMPT_NAME_MAX_LENGTH } from "~/types/savedPrompt";

defineProps<{ valid: boolean }>();

const emit = defineEmits<{ submit: []; cancel: [] }>();

const name = defineModel<string>("name", { required: true });
const prompt = defineModel<string>("prompt", { required: true });

const { t } = useI18n();
</script>

<template>
    <div class="flex flex-col gap-2">
        <UInput
            v-model="name"
            :maxlength="SAVED_PROMPT_NAME_MAX_LENGTH"
            :placeholder="t('savedPrompts.namePlaceholder')"
            :aria-label="t('savedPrompts.namePlaceholder')"
            class="w-full"
            data-testid="savedPromptFormName"
        />
        <UTextarea
            v-model="prompt"
            :placeholder="t('savedPrompts.promptPlaceholder')"
            :aria-label="t('savedPrompts.promptPlaceholder')"
            :rows="4"
            class="w-full"
            data-testid="savedPromptFormPrompt"
        />
        <div class="flex justify-end gap-2">
            <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                @click="emit('cancel')"
            >
                {{ t("common.cancel") }}
            </UButton>
            <UButton
                size="sm"
                icon="i-lucide-check"
                :disabled="!valid"
                data-testid="savedPromptFormSave"
                @click="emit('submit')"
            >
                {{ t("savedPrompts.save") }}
            </UButton>
        </div>
    </div>
</template>
```

- [ ] **Step 4: Create SavedPromptSaveInline.vue**

Create `app/components/saved-prompt/SavedPromptSaveInline.vue`:

```vue
<script setup lang="ts">
/**
 * "Als Prompt speichern" control for the custom instructions drawer/sheet.
 * Expands into a name field and saves the current instruction text.
 */
import {
    isValidSavedPromptInput,
    SAVED_PROMPT_NAME_MAX_LENGTH,
} from "~/types/savedPrompt";

const props = defineProps<{ prompt: string }>();

const { t } = useI18n();
const { save } = useSavedPrompts();

const expanded = ref(false);
const name = ref("");

const canSave = computed(() =>
    isValidSavedPromptInput(name.value, props.prompt),
);

/** Saves the instruction under the entered name and collapses on success. */
async function submit(): Promise<void> {
    if (!canSave.value) {
        return;
    }
    const ok = await save({ name: name.value, prompt: props.prompt });
    if (ok) {
        cancel();
    }
}

/** Collapses the control and clears the name. */
function cancel(): void {
    name.value = "";
    expanded.value = false;
}
</script>

<template>
    <div>
        <UButton
            v-if="!expanded"
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-bookmark-plus"
            :disabled="!prompt.trim()"
            data-testid="savePromptToggle"
            @click="expanded = true"
        >
            {{ t("savedPrompts.saveAsPrompt") }}
        </UButton>
        <div v-else class="flex items-center gap-2">
            <UInput
                v-model="name"
                :maxlength="SAVED_PROMPT_NAME_MAX_LENGTH"
                :placeholder="t('savedPrompts.namePlaceholder')"
                :aria-label="t('savedPrompts.namePlaceholder')"
                class="flex-1"
                autofocus
                data-testid="savePromptName"
                @keydown.enter.prevent="submit"
            />
            <UButton
                size="sm"
                icon="i-lucide-check"
                :disabled="!canSave"
                data-testid="savePromptSubmit"
                @click="submit"
            >
                {{ t("savedPrompts.save") }}
            </UButton>
            <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                :aria-label="t('common.cancel')"
                @click="cancel"
            />
        </div>
    </div>
</template>
```

- [ ] **Step 5: Create SavedPromptManager.vue**

Create `app/components/saved-prompt/SavedPromptManager.vue`:

```vue
<script setup lang="ts">
/**
 * Lists the user's saved prompts and lets them apply, create, edit, delete,
 * export and import them. Hosted in a UModal (desktop) or UDrawer (mobile).
 */
import {
    isValidSavedPromptInput,
    type SavedPrompt,
} from "~/types/savedPrompt";

const props = defineProps<{ actionsAreAvailable: boolean }>();

const emit = defineEmits<{ apply: [prompt: string] }>();

const { t } = useI18n();
const { prompts, load, save, update, remove, exportToJson, importFromFile } =
    useSavedPrompts();

/** Marker for the "new prompt" form in `editingId`. */
const NEW_PROMPT = "new";

/** Id of the prompt being edited, NEW_PROMPT for the create form, "" when closed. */
const editingId = ref("");
const draftName = ref("");
const draftPrompt = ref("");
/** Id of the prompt whose delete confirmation is showing, "" when none. */
const confirmDeleteId = ref("");
const fileInputRef = ref<HTMLInputElement>();

const draftIsValid = computed(() =>
    isValidSavedPromptInput(draftName.value, draftPrompt.value),
);

onMounted(load);

/** Opens the empty form for a new prompt. */
function startCreate(): void {
    editingId.value = NEW_PROMPT;
    draftName.value = "";
    draftPrompt.value = "";
    confirmDeleteId.value = "";
}

/** Opens the form for an existing prompt. */
function startEdit(prompt: SavedPrompt): void {
    editingId.value = prompt.id;
    draftName.value = prompt.name;
    draftPrompt.value = prompt.prompt;
    confirmDeleteId.value = "";
}

/** Closes the form without saving. */
function cancelEdit(): void {
    editingId.value = "";
}

/** Saves the open form as a new or updated prompt. */
async function submitDraft(): Promise<void> {
    if (!draftIsValid.value) {
        return;
    }
    const input = { name: draftName.value, prompt: draftPrompt.value };
    const ok =
        editingId.value === NEW_PROMPT
            ? await save(input)
            : await update(editingId.value, input);
    if (ok) {
        editingId.value = "";
    }
}

/** Deletes a prompt after inline confirmation. */
async function confirmDelete(id: string): Promise<void> {
    await remove(id);
    confirmDeleteId.value = "";
}

/** First line of a prompt, for the one-line preview. */
function firstLine(text: string): string {
    return text.split("\n")[0] ?? "";
}

/** Opens the browser's file picker for an import file. */
function triggerImport(): void {
    fileInputRef.value?.click();
}

/** Imports the picked file and resets the input so the same file can be picked again. */
async function onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) {
        await importFromFile(file);
    }
}
</script>

<template>
    <div class="flex flex-col gap-3" data-testid="savedPromptManager">
        <div class="flex flex-wrap items-center gap-2">
            <UButton
                size="sm"
                icon="i-lucide-plus"
                data-testid="savedPromptNew"
                @click="startCreate"
            >
                {{ t("savedPrompts.new") }}
            </UButton>
            <div class="flex-1" />
            <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-lucide-download"
                data-testid="savedPromptExport"
                @click="exportToJson"
            >
                {{ t("savedPrompts.export") }}
            </UButton>
            <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-lucide-upload"
                @click="triggerImport"
            >
                {{ t("savedPrompts.import") }}
            </UButton>
            <input
                ref="fileInputRef"
                type="file"
                class="hidden"
                accept="application/json,.json"
                data-testid="savedPromptImportInput"
                @change="onImportFile"
            >
        </div>

        <SavedPromptForm
            v-if="editingId === NEW_PROMPT"
            v-model:name="draftName"
            v-model:prompt="draftPrompt"
            :valid="draftIsValid"
            @submit="submitDraft"
            @cancel="cancelEdit"
        />

        <p
            v-if="prompts.length === 0 && editingId !== NEW_PROMPT"
            class="text-sm text-muted"
        >
            {{ t("savedPrompts.empty") }}
        </p>

        <ul v-else class="flex flex-col divide-y divide-default">
            <li
                v-for="prompt in prompts"
                :key="prompt.id"
                class="py-2"
                data-testid="savedPromptRow"
            >
                <SavedPromptForm
                    v-if="editingId === prompt.id"
                    v-model:name="draftName"
                    v-model:prompt="draftPrompt"
                    :valid="draftIsValid"
                    @submit="submitDraft"
                    @cancel="cancelEdit"
                />

                <div
                    v-else-if="confirmDeleteId === prompt.id"
                    class="flex items-center gap-2"
                >
                    <span class="flex-1 text-sm">
                        {{ t("savedPrompts.confirmDelete") }}
                    </span>
                    <UButton
                        size="sm"
                        color="error"
                        icon="i-lucide-trash-2"
                        data-testid="savedPromptConfirmDelete"
                        @click="confirmDelete(prompt.id)"
                    >
                        {{ t("common.delete") }}
                    </UButton>
                    <UButton
                        size="sm"
                        variant="ghost"
                        color="neutral"
                        @click="confirmDeleteId = ''"
                    >
                        {{ t("common.cancel") }}
                    </UButton>
                </div>

                <div v-else class="flex items-center gap-1">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">
                            {{ prompt.name }}
                        </p>
                        <p class="text-xs text-muted truncate">
                            {{ firstLine(prompt.prompt) }}
                        </p>
                    </div>
                    <UTooltip :text="t('actions.apply')">
                        <UButton
                            size="sm"
                            variant="ghost"
                            color="neutral"
                            icon="i-lucide-play"
                            :aria-label="t('actions.apply')"
                            :disabled="!props.actionsAreAvailable"
                            data-testid="savedPromptApply"
                            @click="emit('apply', prompt.prompt)"
                        />
                    </UTooltip>
                    <UTooltip :text="t('common.edit')">
                        <UButton
                            size="sm"
                            variant="ghost"
                            color="neutral"
                            icon="i-lucide-pencil"
                            :aria-label="t('common.edit')"
                            data-testid="savedPromptEdit"
                            @click="startEdit(prompt)"
                        />
                    </UTooltip>
                    <UTooltip :text="t('common.delete')">
                        <UButton
                            size="sm"
                            variant="ghost"
                            color="error"
                            icon="i-lucide-trash-2"
                            :aria-label="t('common.delete')"
                            data-testid="savedPromptDelete"
                            @click="confirmDeleteId = prompt.id"
                        />
                    </UTooltip>
                </div>
            </li>
        </ul>
    </div>
</template>
```

- [ ] **Step 6: Rewrite UserActions.vue**

Replace the whole content of `app/components/rewrite/quick-action/UserActions.vue`:

```vue
<script lang="ts" setup>
/**
 * "Meine Aktionen" menu: backend user actions, the prompts saved in this
 * browser (marked "Lokal"), and the entry that opens the prompt manager.
 */
import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type { DropdownMenuItem } from "@nuxt/ui";
import {
    type TextAction,
    TextActionGetOutputSchema,
} from "~~/shared/text-actions";

interface InputProps {
    actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit = defineEmits<{
    "apply-action": [action: string, config?: string];
}>();

const { t } = useI18n();
const { showError } = useUserFeedback();
const logger = useLogger();
const { prompts: savedPrompts, load: loadSavedPrompts } = useSavedPrompts();

const userActions = ref<TextAction[]>([]);
const managerOpen = ref(false);

onMounted(async () => {
    loadSavedPrompts();

    const response = await apiFetch("/api/user-actions", {
        method: "get",
        schema: TextActionGetOutputSchema,
    });

    if (isApiError(response)) {
        logger.error(response, "Failed to load user actions");
        showError(response);
    } else {
        userActions.value = response.actions;
    }
});

/** Applies a saved prompt from the manager and closes it. */
function applySavedPrompt(prompt: string): void {
    managerOpen.value = false;
    emit("apply-action", "custom", prompt);
}

// Three groups: backend actions, local prompts, manage entry. Empty groups are
// left out. The trigger stays enabled so the manager opens on an empty editor;
// the action items are disabled instead.
const items = computed<DropdownMenuItem[][]>(() => {
    const groups: DropdownMenuItem[][] = [];

    if (userActions.value.length > 0) {
        groups.push(
            userActions.value.map(
                (action) =>
                    ({
                        label: action.name,
                        tooltip: action.tooltip,
                        disabled: !props.actionsAreAvailable,
                        onSelect: () => emit("apply-action", action.id),
                    }) satisfies DropdownMenuItem,
            ),
        );
    }

    if (savedPrompts.value.length > 0) {
        groups.push(
            savedPrompts.value.map(
                (prompt) =>
                    ({
                        label: prompt.name,
                        icon: "i-lucide-hard-drive",
                        tooltip: t("savedPrompts.localTooltip"),
                        local: true,
                        disabled: !props.actionsAreAvailable,
                        onSelect: () =>
                            emit("apply-action", "custom", prompt.prompt),
                    }) satisfies DropdownMenuItem,
            ),
        );
    }

    groups.push([
        {
            label: t("savedPrompts.manage"),
            icon: "i-lucide-settings-2",
            onSelect: () => {
                managerOpen.value = true;
            },
        },
    ]);

    return groups;
});
</script>

<template>
    <UDropdownMenu :items="items">
        <UButton
            variant="link"
            color="neutral"
            size="sm"
            data-tour="user-actions"
            data-testid="userActionsMenu"
        >
            {{ t("editor.userActions") }}
        </UButton>
        <template #item-label="{ item }">
            <UTooltip :text="item.tooltip" :disabled="!item.tooltip">
                <span>{{ item.label }}</span>
            </UTooltip>
        </template>
        <template #item-trailing="{ item }">
            <UBadge
                v-if="item.local"
                :label="t('savedPrompts.local')"
                variant="subtle"
                color="neutral"
                size="sm"
            />
        </template>
    </UDropdownMenu>

    <UModal v-model:open="managerOpen" :title="t('savedPrompts.managerTitle')">
        <template #body>
            <SavedPromptManager
                :actions-are-available="props.actionsAreAvailable"
                @apply="applySavedPrompt"
            />
        </template>
    </UModal>
</template>
```

`TransformTab.vue` already passes `@apply-action="applyAction"` and `applyAction(action, config?)` accepts both arguments; it needs no change.

- [ ] **Step 7: Add saving to the desktop custom drawer**

In `app/components/rewrite/quick-action/CustomAction.vue`, insert between the closing `</UTextarea>` and the "Anwenden" `<UButton`:

```vue
                <SavedPromptSaveInline :prompt="customText" />
```

- [ ] **Step 8: Run the e2e test to verify it passes**

Run: `mise run test:e2e -- tests/e2e/savedPrompts.spec.ts`
Expected: PASS, 5 tests. Then run the whole e2e suite (`mise run test:e2e`) and confirm `tests/e2e/rewrite.spec.ts` still passes, in particular "Custom action button should be present".

- [ ] **Step 9: Check the UI by hand**

Start `mise run dummy` and confirm at desktop width: the "Lokal" badge sits at the right of local items, the tooltip on backend actions still shows, the modal is readable in light and dark mode, and long names and prompts truncate instead of overflowing.

- [ ] **Step 10: Commit**

```bash
bun run check
git add app/components/saved-prompt app/components/rewrite/quick-action/UserActions.vue app/components/rewrite/quick-action/CustomAction.vue tests/e2e/savedPrompts.spec.ts
git commit -m "feat(saved-prompts): save, apply and manage prompts on desktop"
```

---

### Task 6: Mobile integration

**Files:**
- Modify: `app/composables/useMobileActions.ts`
- Modify: `app/components/ribbon/MobileTransformTab.vue`
- Modify: `app/components/ribbon/CustomSheet.vue`
- Test: `tests/e2e/savedPromptsMobile.spec.ts`

**Interfaces:**
- Consumes: `useSavedPrompts()` (Task 4), `<SavedPromptManager>`, `<SavedPromptSaveInline>` (Task 5), i18n `savedPrompts.manage`, `savedPrompts.managerTitle`, `actions.more`.
- Produces: `MobileAction` variant `{ kind: "manage"; id: string; label: string; icon: string }`; test ids `customSheetTextBox`, `mobileCustomAction`, `savedPromptManageMobile`.

- [ ] **Step 1: Write the failing e2e test**

Create `tests/e2e/savedPromptsMobile.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };

// Phone width: the app renders the mobile ribbon below the `md` breakpoint.
test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".tiptap")).toBeVisible();
});

test("Prompt saved on mobile appears and applies", async ({ page }) => {
    await page.locator(".tiptap").fill("This is a test.");
    await page.locator('[data-tour="custom-quick-action-mobile"]').click();
    await page.getByTestId("mobileCustomAction").click();
    await page.getByTestId("customSheetTextBox").fill("Make it short!");
    await page.getByTestId("savePromptToggle").click();
    await page.getByTestId("savePromptName").fill("Mobil-Prompt");
    await page.getByTestId("savePromptSubmit").click();
    await expect(
        page.getByText(local.savedPrompts.toast.saved).first(),
    ).toBeVisible();

    // Close the nested custom sheet; the "Weitere Aktionen" drawer stays open.
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Mobil-Prompt" }).click();

    const diffReview = page.locator('[data-tour="diff-review"]');
    await expect(diffReview).toBeVisible();
    await expect(diffReview).toContainText("Options: Make it short!");
});

test("Prompt manager opens on mobile with an empty editor", async ({
    page,
}) => {
    await page.locator('[data-tour="custom-quick-action-mobile"]').click();
    await page.getByTestId("savedPromptManageMobile").click();

    await expect(page.getByTestId("savedPromptManager")).toBeVisible();
});
```

- [ ] **Step 2: Run the e2e test to verify it fails**

Run: `mise run test:e2e -- tests/e2e/savedPromptsMobile.spec.ts`
Expected: FAIL, `mobileCustomAction` not found (and the "Weitere Aktionen" button is disabled on an empty editor).

- [ ] **Step 3: Extend the mobile action model**

In `app/composables/useMobileActions.ts`:

Add a fourth variant to the `MobileAction` union, after the `kind: "custom"` variant:

```ts
    | {
          kind: "manage";
          id: string;
          label: string;
          icon: string;
      };
```

Inside `useMobileActions`, after `const logger = useLogger();`, add:

```ts
    const { prompts: savedPrompts, load: loadSavedPrompts } =
        useSavedPrompts();
```

In the existing `onMounted(async () => {`, make the first statement:

```ts
        loadSavedPrompts();
```

In the `"custom"` group, after the spread of `userActions.value.map(...)`, append:

```ts
                // Prompts saved in this browser run as the "custom" action.
                ...savedPrompts.value.map((prompt) => ({
                    kind: "simple" as const,
                    id: `saved-prompt-${prompt.id}`,
                    label: prompt.name,
                    icon: "i-lucide-hard-drive",
                    action: "custom",
                    config: prompt.prompt,
                })),
                {
                    kind: "manage" as const,
                    id: "manage-saved-prompts",
                    label: t("savedPrompts.manage"),
                    icon: "i-lucide-settings-2",
                },
```

- [ ] **Step 4: Render the manage action and keep the drawer reachable**

In `app/components/ribbon/MobileTransformTab.vue`:

In `<script setup>`, after `const moreOpen = ref(false);` add:

```ts
const managerOpen = ref(false);

/** Applies a prompt picked in the manager and closes both drawers. */
function onManagerApply(prompt: string): void {
    managerOpen.value = false;
    moreOpen.value = false;
    apply("custom", prompt);
}
```

On the "Weitere Aktionen" trigger `<UButton ... data-tour="custom-quick-action-mobile">`, delete the line `:disabled="!actionsAreAvailable"`. Every action inside the drawer keeps its own `:disabled`, and the manager must open on an empty editor.

On the `<div>` inside `<RibbonCustomSheet v-else-if="action.kind === 'custom'" ...>`, add `data-testid="mobileCustomAction"` to the row `div` (the one with `class="flex items-center gap-3 px-3 py-3.5 ..."`).

Insert this branch directly after the closing `</RibbonCustomSheet>` and before the `<button v-else ...>`:

```vue
                            <UDrawer
                                v-else-if="action.kind === 'manage'"
                                v-model:open="managerOpen"
                                nested
                                :title="t('savedPrompts.managerTitle')"
                            >
                                <button
                                    type="button"
                                    class="flex items-center gap-3 w-full px-3 py-3.5 text-left active:bg-elevated/50 transition"
                                    data-testid="savedPromptManageMobile"
                                >
                                    <UIcon
                                        :name="action.icon"
                                        class="size-5 shrink-0"
                                    />
                                    <span class="flex-1 text-sm">{{
                                        action.label
                                    }}</span>
                                    <UIcon
                                        name="i-lucide-chevron-right"
                                        class="size-4 text-muted"
                                    />
                                </button>

                                <template #body>
                                    <SavedPromptManager
                                        :actions-are-available="actionsAreAvailable"
                                        @apply="onManagerApply"
                                    />
                                </template>
                            </UDrawer>
```

- [ ] **Step 5: Add saving to the mobile custom sheet**

In `app/components/ribbon/CustomSheet.vue`, add `data-testid="customSheetTextBox"` to the `<UTextarea>`, and insert after it, before the "Anwenden" `<UButton`:

```vue
                <SavedPromptSaveInline :prompt="text" />
```

- [ ] **Step 6: Run the e2e tests to verify they pass**

Run: `mise run test:e2e -- tests/e2e/savedPromptsMobile.spec.ts tests/e2e/savedPrompts.spec.ts`
Expected: PASS, 7 tests.

- [ ] **Step 7: Check the UI by hand at phone width**

With `mise run dummy` and the browser at 390 px: the manage row sits last in the "Benutzerdefiniert" group, local prompts show the hard-drive icon, the nested manager drawer scrolls with many prompts, and the "Weitere Aktionen" button opens on an empty editor while every text action inside stays greyed out.

- [ ] **Step 8: Commit**

```bash
bun run check
git add app/composables/useMobileActions.ts app/components/ribbon/MobileTransformTab.vue app/components/ribbon/CustomSheet.vue tests/e2e/savedPromptsMobile.spec.ts
git commit -m "feat(saved-prompts): save, apply and manage prompts on mobile"
```

---

### Task 7: Onboarding tour step

**Files:**
- Modify: `app/composables/useOnboarding.ts`
- Modify: `i18n/locales/de.json`, `i18n/locales/en.json`

**Interfaces:**
- Consumes: `data-tour="user-actions"` (Task 5), `data-tour="custom-quick-action-mobile"` (existing), `resolveTourTarget` and `setRibbonTab` (existing in `useOnboarding.ts`).
- Produces: i18n keys `tour.savedPrompts.title` and `tour.savedPrompts.content`.

- [ ] **Step 1: Add the tour strings**

In `i18n/locales/de.json`, inside `"tour"`, directly after the `"customQuickAction": { ... }` object, add:

```json
        "savedPrompts": {
            "title": "Eigene Prompts speichern",
            "content": "Speichere Deine benutzerdefinierten Anweisungen unter einem Namen und wende sie später mit einem Klick an. Gespeicherte Prompts findest Du unter «Meine Aktionen» mit dem Vermerk «Lokal». Sie liegen nur in diesem Browser. Über «Prompts verwalten» kannst Du sie bearbeiten, löschen sowie als Datei exportieren und importieren, um sie mit anderen zu teilen."
        },
```

In `i18n/locales/en.json`, at the same place:

```json
        "savedPrompts": {
            "title": "Save your own prompts",
            "content": "Save your custom instructions under a name and apply them later with one click. Saved prompts appear under \"My Actions\" marked \"Local\". They are stored only in this browser. Under \"Manage prompts\" you can edit and delete them, and export and import them as a file to share with others."
        },
```

- [ ] **Step 2: Add the step**

In `app/composables/useOnboarding.ts`, in the `.switchPhase("transform").addSteps([ ... ])` list, insert after the "Custom action" step object (the one with `title: () => t("tour.customQuickAction.title")`) and before the closing `])`:

```ts
            // Saved prompts — "Meine Aktionen" on desktop; on mobile they live
            // in the "Weitere Aktionen" drawer, so point at its trigger.
            {
                element: () =>
                    resolveTourTarget(
                        '[data-tour="user-actions"]',
                        '[data-tour="custom-quick-action-mobile"]',
                    ),
                popover: {
                    title: () => t("tour.savedPrompts.title"),
                    description: () => t("tour.savedPrompts.content"),
                    side: "bottom",
                    align: "center",
                },
                onHighlightStarted: () => {
                    setRibbonTab("transform");
                },
            },
```

- [ ] **Step 3: Verify build and checks**

Run: `AUTH_MODE=none APP_MODE=ci bunx nuxt build && bunx biome ci .`
Expected: exit 0.

- [ ] **Step 4: Check the tour by hand**

The e2e server disables onboarding, so check manually. Run `mise run dummy`, open the app in a private window (no `tour-completed` cookie), and walk the tour. On desktop the new step highlights "Meine Aktionen" right after "Benutzerdefinierte Umschreibaktionen". Repeat at 390 px width: the step highlights "Weitere Aktionen". In both cases the step after it (diff review) still works.

- [ ] **Step 5: Commit**

```bash
bun run check
git add app/composables/useOnboarding.ts i18n/locales/de.json i18n/locales/en.json
git commit -m "feat(saved-prompts): add onboarding tour step"
```

---

### Task 8: Changelog, version bump and final verification

**Files:**
- Create: `server/assets/changelogs/v1.8.0.md`
- Modify: `package.json` (`"version": "1.7.0"` → `"1.8.0"`)

**Interfaces:**
- Consumes: everything above.
- Produces: release notes for 1.8.0.

- [ ] **Step 1: Write the changelog**

Create `server/assets/changelogs/v1.8.0.md` (same front matter and voice as `v1.7.0.md`; set `published_at` to the actual release date when the PR merges):

```md
---
title: "Version 1.8.0 - Eigene Prompts speichern"
version: "1.8.0"
published_at: "2026-10-02"
---

## 🔖 Eigene Prompts speichern und wiederverwenden
Deine benutzerdefinierten Anweisungen gehen nicht mehr verloren:
- **Unter einem Namen speichern**: Im Feld «Benutzerdefinierte Anweisungen» speicherst du eine Anweisung mit «Als Prompt speichern» unter einem eigenen Namen.
- **Mit einem Klick anwenden**: Gespeicherte Prompts findest du unter **«Meine Aktionen»**. Der Vermerk «Lokal» zeigt, dass sie nur in deinem Browser liegen.
- **Bearbeiten und löschen**: Unter «Prompts verwalten» passt du Namen und Anweisungen an oder entfernst Prompts, die du nicht mehr brauchst.
- **Teilen per Export und Import**: Exportiere deine Prompts als JSON-Datei und gib sie an Kolleginnen und Kollegen weiter. Beim Import werden bereits vorhandene Prompts übersprungen.
- **Auch auf dem Smartphone**: Alle Funktionen stehen in der mobilen Ansicht unter «Weitere Aktionen» zur Verfügung.

Gespeicherte Prompts liegen nur in deinem Browser und nicht auf dem Server. Es gibt keine Synchronisation zwischen Geräten, nutze den Export deshalb auch als Sicherung.

## 🧭 Einführungstour
- Die Tour zeigt neu, wo du deine gespeicherten Prompts findest.

---

Viel Freude beim Schreiben und Überarbeiten mit TextMate 1.8.0! Wir freuen uns über Feedback und Anregungen.
```

- [ ] **Step 2: Bump the version**

In `package.json` change `"version": "1.7.0"` to `"version": "1.8.0"`.

- [ ] **Step 3: Run the full CI equivalent**

Run:
```bash
AUTH_MODE=none APP_MODE=ci CI=true bunx nuxt build && bunx biome ci . && APP_MODE=ci bunx vitest run && mise run test:e2e
```
Expected: build exit 0, Biome clean, all unit tests pass (173 existing + 33 new), all e2e tests pass (existing + 7 new).

- [ ] **Step 4: Confirm the changelog renders**

With `mise run dummy`, open the changelog dialog from the app and check that "Version 1.8.0 - Eigene Prompts speichern" shows first.

- [ ] **Step 5: Commit**

```bash
bun run check
git add server/assets/changelogs/v1.8.0.md package.json
git commit -m "chore: release notes and version 1.8.0 for saved prompts"
```
