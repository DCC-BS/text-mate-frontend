# Saved prompts ("Benutzerdefinierte Prompts")

Date: 2026-10-02
Branch: `feat/saved-prompts`

## Goal

Users type custom rewrite instructions into the "Benutzerdefinierte Anweisungen" field. Today that text is lost after each use. Users can now save an instruction under a name, reuse it with one click, edit or delete it, and share it with colleagues through a JSON export and import.

Saved prompts live only in the user's browser (IndexedDB). There is no server storage and no sync between devices. Export and import are the sharing and backup path.

Success means a user saves a prompt once, finds it in "Meine Aktionen" marked as local, applies it with one click, and can hand a colleague a JSON file that imports cleanly. This works the same on desktop and mobile.

## Scope

In scope:

- Save, list, apply, edit, delete, export and import saved prompts.
- Desktop ribbon and mobile ribbon, with the full feature set on both.
- Show local prompts next to the backend user actions ("Meine Aktionen") and mark them as local.
- Add `dexie` and use it for the new store.
- A new onboarding tour step and a changelog entry for version 1.8.0.
- Remove the dead user dictionary feature and the dead copy of the tour (see "Dead code removal").

Out of scope:

- Backend changes. A saved prompt runs through the existing `custom` quick action.
- Sync between devices or browsers.
- Deleting the old `userDictionary` IndexedDB database from users' browsers. It is a few bytes of unused data and nothing reads it.

## Existing code this builds on

- `custom` quick action. `CustomAction.vue` (desktop drawer) and `CustomSheet.vue` (mobile sheet) send the free text as `options` with action `"custom"`.
- Backend user actions ("Meine Aktionen"). `UserActions.vue` and `useMobileActions.ts` fetch `/api/user-actions` and apply an action by its id. The prompt text stays on the server.
- DI services. `app/plugins/serviceRegistrant.ts` registers classes with a static `$injectKey`. Components resolve them with `useService(...)`.
- Dexie pattern from `@dcc-bs/audio-recorder.bs.js`. One module creates the Dexie instance and declares versioned `.stores()`.

## Data model

`app/types/savedPrompt.ts`:

```ts
/** A prompt the user saved in this browser. */
export interface SavedPrompt {
    id: string; // uuid v7, as elsewhere in the app
    name: string; // 1..80 chars, trimmed
    prompt: string; // non-empty, trimmed
    createdAt: number; // epoch ms
    updatedAt: number; // epoch ms
}
```

Zod schemas in the same file validate input:

- `SavedPromptInputSchema`: `{ name, prompt }` with the length rules above. Used by save, update and import.
- `SavedPromptExportSchema`: `{ version: z.literal(1), prompts: z.array(SavedPromptInputSchema) }`. Used to write and to validate import files.

The export file holds only `name` and `prompt` per entry. Ids and timestamps are local details, and import assigns new ones.

Example export (`textmate-prompts.json`):

```json
{
    "version": 1,
    "prompts": [
        { "name": "Medienmitteilung", "prompt": "Schreibe den Text als kurze Medienmitteilung ..." }
    ]
}
```

## Storage

`app/assets/services/db.ts` creates the Dexie database, following the audio-recorder layer:

```ts
import Dexie, { type EntityTable } from "dexie";
import type { SavedPrompt } from "~/types/savedPrompt";

/** TextMate's local IndexedDB database. */
export const db = new Dexie("TextMateDB") as Dexie & {
    savedPrompts: EntityTable<SavedPrompt, "id">;
};

db.version(1).stores({
    savedPrompts: "id, name, updatedAt",
});
```

`app/assets/queries/savedPrompt.query.interface.ts` defines `ISavedPromptQuery`. `app/assets/queries/savedPrompt.query.ts` implements it as `SavedPromptQuery`:

| Method | Behaviour |
|---|---|
| `getAll(): Promise<SavedPrompt[]>` | All prompts, sorted by name (German collation, `localeCompare(…, "de")`). |
| `add(input): Promise<SavedPrompt>` | Validates, assigns id and timestamps, stores. |
| `update(id, input): Promise<SavedPrompt>` | Validates, updates `name`, `prompt` and `updatedAt`. Throws if the id is missing. |
| `remove(id): Promise<void>` | Deletes. Removing a missing id is a no-op. |
| `addMany(inputs): Promise<number>` | Bulk insert for import, in one transaction. Returns the count. |

`SavedPromptQuery` has `$injectKey = "savedPromptQuery"` and `$inject = []`, like the old dictionary query. It is registered in `serviceRegistrant.ts`. It does no logging. Errors propagate, and `useSavedPrompts` logs them and shows a toast. Tests can construct the class directly, without the DI container.

File names use camelCase per the DCC guidelines. The `.query` and `.query.interface` suffixes match the existing query naming.

## Composable

`app/composables/useSavedPrompts.ts` follows the module-level singleton style of `useWorkspace`, so desktop and mobile share one list:

```ts
export function useSavedPrompts() {
    // prompts: Readonly<Ref<SavedPrompt[]>>, loaded on first use
    // save(input), update(id, input), remove(id)
    // exportToJson(): void
    // importFromFile(file: File): Promise<void>
}
```

- The list loads once on the first call and reloads after every write. Writes go through `SavedPromptQuery`.
- Every operation shows a toast on success and on failure (`useToast`, same style as `TextToolbar.vue`). Errors are logged with `useLogger`.
- `exportToJson` builds the export object, makes a `Blob`, and downloads it as `textmate-prompts.json` with `URL.createObjectURL`, as `TextToolbar.vue` does for Word files. With no prompts it shows an info toast and downloads nothing.
- `importFromFile` reads the file, parses the JSON, and validates it with `SavedPromptExportSchema`.
  - Files over 1 MB are rejected before parsing.
  - Invalid JSON or a wrong shape shows an error toast and changes nothing.
  - An entry that matches an existing prompt exactly (same trimmed name and prompt) is skipped.
  - The rest are added with new ids. The toast reports added and skipped counts.

The pure parts (build the export object, parse and validate import text, find duplicates) live in `app/utils/savedPromptTransfer.ts`, so they can be unit tested without Vue or IndexedDB.

## UI

Only Nuxt UI components and Tailwind classes. Icons are Lucide (`i-lucide-*`).

### Shared components

Components live in `app/components/saved-prompt/`. With that folder name Nuxt's auto-import names come out as `SavedPromptManager`, `SavedPromptForm` and `SavedPromptSaveInline`.

`app/components/saved-prompt/SavedPromptManager.vue`:

- Header actions: "Neuer Prompt" (`i-lucide-plus`), "Exportieren" (`i-lucide-download`), "Importieren" (`i-lucide-upload`).
- Import uses a hidden `<input type="file" accept="application/json,.json">`, as `BaseEditor.vue` does.
- List of prompts. Each row shows the name and the first line of the prompt (truncated), plus buttons to apply (`i-lucide-play`), edit (`i-lucide-pencil`) and delete (`i-lucide-trash-2`).
- Edit and "Neuer Prompt" open an inline form in the list, `SavedPromptForm.vue` (`UInput` for the name, `UTextarea` for the prompt, save and cancel buttons). No nested modal.
- Delete asks for confirmation inline ("Wirklich löschen?" with confirm and cancel), again to avoid stacking a modal on a modal.
- Empty state with a short hint on how to save a prompt.
- Emits `apply: [prompt: string]` so the host can run the action and close itself.
- Takes an `actionsAreAvailable` prop. Apply is disabled when no text can be processed.

`app/components/saved-prompt/SavedPromptSaveInline.vue`:

- A "Als Prompt speichern" button (`i-lucide-bookmark-plus`). Clicking it reveals a name `UInput` and a save button.
- Takes the current instruction text as a prop and is disabled while that text is empty.
- Saves through `useSavedPrompts().save`, then collapses and clears the name.

### Desktop

`UserActions.vue` ("Meine Aktionen" dropdown):

- Always visible. It used to hide when the backend returned no actions, but "Prompts verwalten" must stay reachable.
- `UDropdownMenu` items in three groups:
  1. Backend actions, unchanged.
  2. Local prompts. Each has the icon `i-lucide-hard-drive`, a `UBadge` "Lokal" (`variant="subtle"`, `color="neutral"`, `size="sm"`), and the tooltip "Nur in diesem Browser gespeichert". Selecting one emits `apply-action` with `"custom"` and the prompt text.
  3. "Prompts verwalten…" (`i-lucide-settings-2`). Opens `SavedPromptManager` in a `UModal`.
- The trigger button is always enabled, so "Prompts verwalten" works on an empty editor. Backend actions and local prompts are disabled as menu items while no text is available.

`CustomAction.vue` (custom instructions drawer): `SavedPromptSaveInline` sits under the textarea, next to "Anwenden". Apply behaviour does not change.

### Mobile

`useMobileActions.ts`:

- Local prompts join the "Custom" group as `kind: "simple"` actions with `action: "custom"`, `config: prompt.prompt` and icon `i-lucide-hard-drive`. The backend actions keep `i-lucide-user-cog`, so the icon tells them apart.
- New action kind `"manage"` (label "Prompts verwalten", icon `i-lucide-settings-2`) at the end of the group. `MobileAction` gets this variant.

`MobileTransformTab.vue` handles `kind: "manage"` by opening `SavedPromptManager` in a nested `UDrawer`.

The custom group and the user actions sit inside the "Weitere Aktionen" drawer. Its trigger button (`data-tour="custom-quick-action-mobile"`) is disabled today when there is no text. That would block "Prompts verwalten" on an empty editor, so the trigger stays enabled. Every action inside the drawer already has its own `:disabled="!actionsAreAvailable"`, so text-dependent actions stay disabled. The manage action ignores that flag.

`CustomSheet.vue`: `SavedPromptSaveInline` sits under the textarea.

### i18n

New `savedPrompts.*` keys in `i18n/locales/de.json` and `en.json`: labels, the "Lokal" badge, tooltip, form labels, delete confirmation, empty state, and toast messages for save, update, delete, export and import (success and each error case). The "Meine Aktionen" label (`editor.userActions`) stays.

## Onboarding tour

The tour lives in `app/composables/useOnboarding.ts` (used by `layouts/default.vue`). Add one step to the `transform` phase, right after the "Benutzerdefinierte Umschreibaktionen" step:

- Target: `resolveTourTarget('[data-tour="user-actions"]', '[data-tour="custom-quick-action-mobile"]')`. The desktop "Meine Aktionen" button gets the new `data-tour="user-actions"` attribute. On mobile the saved prompts sit in the "Weitere Aktionen" drawer, so the step points at its trigger, the same element as the step before.
- `onHighlightStarted` calls `setRibbonTab("transform")`, like its neighbours.
- New i18n keys `tour.savedPrompts.title` and `tour.savedPrompts.content` in both locales. German draft:
  - Title: "Eigene Prompts speichern"
  - Content: "Speichere Deine benutzerdefinierten Anweisungen unter einem Namen und wende sie später mit einem Klick an. Gespeicherte Prompts findest Du unter «Meine Aktionen» mit dem Vermerk «Lokal». Sie liegen nur in diesem Browser. Über «Prompts verwalten» kannst Du sie bearbeiten, löschen sowie als Datei exportieren und importieren, um sie mit anderen zu teilen."

The tour seeds example text before this phase, so the "Meine Aktionen" button is enabled when the step shows.

## Changelog and version

- New file `server/assets/changelogs/v1.8.0.md` with the same front matter and style as `v1.7.0.md` (German, `##` sections with an emoji, short bullet lists, closing line). `published_at` is the release date and gets set when the PR merges.
- One section on saved prompts: save under a name, find them under "Meine Aktionen" marked "Lokal", edit and delete, export and import as JSON for sharing, available on desktop and mobile, stored only in the browser.
- `package.json` version goes from `1.7.0` to `1.8.0`, in the same PR, as #176 did for 1.7.0.

## Dead code removal

Nothing renders the user dictionary feature. Remove:

- `app/components/tool-panel/UserDictionary.vue`
- `app/assets/queries/user_dictionary.query.ts`
- `app/assets/queries/user_dictionary.query.interface.ts`
- The `UserDictionaryQuery` import and `builder.register(UserDictionaryQuery)` in `app/plugins/serviceRegistrant.ts`
- i18n keys `user-dictionary.*` and `text-editor.addWordToDictionary` in both locales

`app/components/OnboardingView.vue` is an older copy of the tour that nothing renders. The live tour is `useOnboarding.ts`. Remove the component, so the new step only has to go in one place.

## Dependencies

- `dexie` (runtime). Same major as the audio-recorder layer (4.x).
- `fake-indexeddb` (dev). happy-dom has no IndexedDB, so unit tests load `fake-indexeddb/auto`.

Both go through Bun and the 7-day `minimumReleaseAge` in `bunfig.toml`.

## Testing

Unit tests (Vitest, `tests/assets/...`):

- `utils/savedPromptTransfer.test.ts`: builds the export object; accepts a valid file; rejects invalid JSON, a wrong `version`, missing fields, an empty name, a name over 80 characters; finds exact duplicates.
- `queries/savedPrompt.query.test.ts` (with `fake-indexeddb`): add, getAll sorted by name, update, update of a missing id throws, remove, addMany.
- `composables/useSavedPrompts.test.ts`: import adds new entries and skips duplicates; an oversized file is rejected; export with an empty list downloads nothing.

E2E (Playwright, `tests/e2e/savedPrompts.spec.ts`), on desktop:

- Save a prompt from the custom drawer, then apply it from "Meine Aktionen" and see `Action: custom` in the diff review (dummy backend).
- Edit and delete it in the manager.
- Export, clear, import the exported file, and see the prompt again.

The e2e server runs with onboarding disabled, and no e2e test covers the tour. The new tour step gets a manual check on desktop and at phone width: run the tour and confirm the step highlights "Meine Aktionen" or "Weitere Aktionen" and shows the text.

One mobile e2e case: save from the custom sheet and see the prompt in the Custom group. The Playwright config only has a desktop project, so this case sets a phone viewport with `test.use({ viewport: { width: 390, height: 844 } })` in the spec file. The app switches to the mobile ribbon by viewport (`nuxt-viewport`).

The definition of done is the CI pipeline: `nuxt build` (which runs `vue-tsc`), `biome ci`, the unit tests and the e2e tests all pass.
