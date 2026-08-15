# Code Review: Einfache Sprache (`feat/einfache-sprache`)

**Review Scope:** Branch `feat/einfache-sprache` compared against `origin/main` and DCC Nuxt Guidelines ([`nuxt.md`](https://github.com/DCC-BS/documentation/blob/main/markdown/coding/nuxt.md) & [`AGENTS.md`](../AGENTS.md)).

---

## 1. Compliance with Nuxt & DCC Standards

### 1.1 File Naming & Structure
- ✅ **Pages**: Follows kebab-case (no new pages added).
- ✅ **Components**: PascalCase (`SimplifyProgress.vue`, `SimplifyRangeNav.vue`, `ReadabilityScoreBadge.vue`).
- ✅ **Composables & Utils**: camelCase (`useSimplify.ts`, `useSimplifyRanges.ts`, `advisorText.ts`, `readability.ts`, `simplifyDecorations.ts`, `simplifyRanges.ts`).
- ✅ **Server API**: kebab-case (`server/api/simplify.post.ts`).
- ✅ **Layer Integration**: Proper usage of `apiHandler`, `#shared`, and `~~/` aliases.

### 1.2 Vue & TypeScript Conventions
- 🟡 **Script Setup Header Order**: Components used `<script lang="ts" setup>` instead of `<script setup lang="ts">`.
- 🟡 **`null` vs `undefined` Violations**:
  - `app/composables/useSimplifyRanges.ts`: Initialized `const activeRangeId = ref<string | null>(null);` and used `null` checks across methods instead of `undefined`.
  - `app/composables/useWorkspace.ts`: `let fixAbort: AbortController | null = null;`.
  - `app/components/WorkspaceContainer.vue`: `ref<InstanceType<typeof DiffViewer> | null>(null);`.
- 🟡 **Function Declarations vs Arrow Callbacks**:
  - Internal named methods correctly use `function` declarations.
  - Anonymous callbacks in `computed`, `watch`, array methods (`.map()`, `.filter()`), and ProseMirror plugins use arrow functions. Where possible, standard function declarations are preferred.
- 🟡 **Explicit Types**: `shared/types/simplify.ts:absentAsUndefined` lacked an explicit return type.

---

## 2. Code Duplication vs. Reuse

### 2.1 JSON Lines Stream Parsing Duplication
- **Finding**: `app/composables/useSimplify.ts` (lines 109–196) implements custom chunked line-buffering, `TextDecoder` streaming, newline splitting, and Zod parsing for JSON Lines (NDJSON). This is a near-exact duplicate of `app/composables/useAdvisor.ts` (lines 98–200).
- **Recommendation**: Extract a reusable generic stream parser:
  ```ts
  // app/utils/stream.ts
  export async function* parseJsonLinesStream<T>(
      response: ReadableStream<Uint8Array>,
      schema: z.ZodSchema<T>,
      signal?: AbortSignal,
  ): AsyncGenerator<T, void, void>
  ```

### 2.2 ProseMirror Position Reflow & Decorations (Strong Reuse ✅)
- **Finding**: `app/utils/advisorText.ts` was made generic over `RangedItem` (`reflowAdvisorRanges<T>`). Both `AdvisorThread` (Advisor marks) and `SimplifyRange` (unconverged readability ranges) reuse this exact reflow engine on document transactions without duplicating offset mapping logic.
- **Finding**: `simplifyRanges.ts` directly reuses `advisorSegments`, `clampOffset`, and `splitByParagraph` from `advisorText.ts`.

### 2.3 Readability & CEFR Score Visualization Refactoring (Strong Reuse ✅)
- **Finding**: `ReadabilityScoreBadge.vue` and `app/utils/readability.ts` were extracted to unify CEFR and metric formatting across `CefrScoreVisualization.vue`, `DiffViewer.vue`, and `SimplifyProgress.vue`.
- **Cleanup Needed**: Legacy `zixScore` in `useCefrScore.ts` is no longer consumed and should be deprecated/removed.

---

## 3. Logger Semantics

- **Server-Side**:
  - `server/api/simplify.post.ts` correctly avoids rogue `console.log`/`console.error` calls and delegates request tracking and error handling to the DCC layer pipeline (`pino-logger`).
- **Client-Side Logger Violations**:
  - `app/composables/useWorkspace.ts:184`: Used `console.error("Simplification failed:", error);`.
  - `app/composables/useWorkspace.ts:291`: Used `console.error("Advisor validation failed:", error);`.
  - `app/composables/useWorkspace.ts:358`: Used `console.error("Advisor fix failed:", error);`.
  - `app/composables/useCefrScore.ts:65`: Used `console.error("Failed to fetch CEFR understandability score:", err);`.
  - **Resolution**: Replaced with `const logger = useLogger(); logger.error(...)`.

---

## 4. UI Components: Nuxt UI & Common-UI vs Custom Elements

| Component | Current State | Recommendation / Action |
| :--- | :--- | :--- |
| `SimplifyProgress.vue` | Uses `UProgress`, `UIcon`. Container used raw `bg-gray-50 dark:bg-gray-900`. | Use semantic theme surfaces (`bg-elevated`, `border-default`). |
| `SimplifyRangeNav.vue` | Uses `UButton`, `UIcon`. Banner was built with custom div and hardcoded blue/amber palette colors. | Normalize colors to semantic `text-info` / `text-warning` / `border-default`. |
| `ReadabilityScoreBadge.vue` | Renders inline `<span>` elements. | Standardized inline typography; colors driven by `readability.ts`. |
| `DiffViewer.vue` | Extensive raw palette colors (`bg-green-100`, `bg-red-50`, `text-green-800`, `text-red-800`, `text-amber-500`). | Migrate diff token styles to CSS variables or semantic tokens (`bg-success/15`, `bg-error/15`, `text-success`, `text-error`). |
| `TransformTab.vue` | Contained hardcoded English strings `"Error"` and `"No text to process"`. | Fixed to use `t("errors.title")` and `t("errors.no_text_to_process")`. |
| `TextStatsView.vue` | Unused import `FleschScoreVisualization` and commented-out template code. | Dead code removed. |

---

## 5. Error Handling & API Protocols

### 5.1 Server-Side Validation Error Status (High Priority)
- **Issue in `server/api/simplify.post.ts`**:
  ```ts
  // ❌ Throwing client-side ApiError in Nitro/H3 route handler:
  throw new ApiError("invalid_input", 400, z.prettifyError(result.error));
  ```
  `ApiError` is a client SDK class containing `.status` (not `.statusCode`). H3's error handler fails to recognize `statusCode` and converts it to **HTTP 500 Internal Server Error** ("Backend Communication Error").
- **Fix**:
  ```ts
  // ✅ Standard H3 createError:
  throw createError({
      statusCode: 400,
      statusMessage: "Invalid input",
      data: z.prettifyError(result.error),
  });
  ```

### 5.2 Client-Side Error Presentation
- Currently, three separate error presentation patterns coexist:
  1. `useToast().add({ color: "error", ... })`
  2. `useUseErrorDialog().sendError(...)`
  3. `useUserFeedback().showError(...)`
- In `useFileConvert.ts`, `useUseErrorDialog()` was incorrectly called inside async event callbacks.
- **Recommendation**: Unify error notifications on `useToast` / `useUserFeedback` and ensure composables are instantiated only in setup scopes.

---

## 6. CSS & Styling Analysis

- **`app/assets/css/partials/advisor.css`**:
  - Required for ProseMirror decorations (`.advisor-mark`, `.simplify-mark`, `.advisor-diff-del`, `.advisor-diff-add`) because ProseMirror injects CSS class names directly into DOM text nodes.
  - **Improvement**: Avoid hardcoding hex fallbacks (`#a56cc9`, `#00b590`, `#3b82f6`, `#f59e0b`). Use standardized CSS variables and design tokens.
- **Component Styles**:
  - Zero `<style>` blocks were introduced in `.vue` files, adhering to the Tailwind CSS guideline.

---

## 7. Comment Cleanup Summary

The codebase was bloated with 250+ lines of essay-style comments, PR historical notes, ADR quotes, and trivial JSX labels. All have been cleaned up according to the following rules:

1. **Removed Architectural Essays & PR Histories**:
   - `useSimplify.ts`: 14-line essay explaining why `simplifiedText` is not assembled from `chunk_done`.
   - `useWorkspace.ts`: 12-line history of flickering diff reviews.
   - `SimplifyRangeNav.vue`: 13-line narrative citing `T6.7` and `docs/simplify_redesign.md §14.4`.
   - `advisorText.ts`: 50+ lines of DOM separator implementation post-mortems.
   - `DiffViewer.vue`: 40+ lines of ADR 0002/0003 recaps.
2. **Removed Obvious Template / Prop Comments**:
   - `CefrScoreVisualization.vue`: Removed 1-to-2 line comment on every single prop and self-evident comments like `<!-- Loading State -->`, `<!-- Success State -->`.
   - `TextStatsView.vue`: Removed commented-out component tags.
3. **Retained Non-Obvious Technical Comments**:
   - Invariants regarding UTF-16 offset mapping vs ProseMirror positions.
   - ZIX and CEFR conversion scale formulas.
   - Non-obvious regex and stopword margin heuristics in dummy analyzers.
