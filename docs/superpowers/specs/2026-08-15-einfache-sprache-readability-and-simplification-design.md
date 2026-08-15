# Design Specification: Multi-Language Readability & Simplification Redesign (`feat/einfache-sprache`)

**Date**: 2026-08-15  
**Topic**: Multi-Language Readability, CEFR Terminology Clarification, and Plain Language Simplification Pipeline Integration  
**Status**: Approved  

---

## 1. Overview & Context

This design outlines the TextMate frontend integration with the updated backend APIs introduced in the `feat/einfache-sprache` redesign. It covers:
1. **Multi-Language Readability Analysis (`POST /text-analysis`)**: Adding calibrated scoring across German (`de`), English (`en`), French (`fr`), and Italian (`it`), with fallback and unsupported language handling.
2. **Readability Terminology Clarification**: Renaming the German label `Sprachniveau (GER)` to `Sprachniveau (GER / CEFR)` to avoid confusing the European framework acronym with the language German.
3. **Retirement of `POST /quick-action` (`plain_language`)**: Enforcing HTTP 400 rejection on the retired legacy action.
4. **Integration with `POST /simplify`**: Consuming the NDJSON event stream (`start`, `progress`, `chunk_done`, `done`), updating the progress UI, and rendering UTF-16 shortfall highlights (`unconverged_ranges`) in the editor.

---

## 2. Architecture & Data Flow

### 2.1 Readability Analysis (`POST /text-analysis`)

#### Schema & Types (`app/assets/models/text-analysis.ts`)
```ts
import type { ReadabilityBand } from "~~/shared/types/simplify";

export type TextAnalysisInput = {
    text: string;
};

export type TextAnalysisResult = {
    /** Detected ISO 639-1 code ("de", "en", "fr", "it"), or unsupported code ("es", "zh"), or null if inconclusive */
    language: string | null;
    /** Raw metric value (ZIX: -10 to +10, Flesch/LIX/Gulpease: 0 to 100). Null for unsupported languages */
    score: number | null;
    /** Metric label: "ZIX" | "CEFR" | "LIX" | "Gulpease" | null */
    score_label: string | null;
    /** Calibrated band: "easy" (target) | "ok" | "hard" | null */
    band: ReadabilityBand | null;
    /** CEFR level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null (Only populated for DE and EN) */
    cefr_level: string | null;
    /** Legacy German ZIX score (-10 to +10). Populated only for German */
    zix_score: number | null;
};
```

#### Language Scoring Matrix & Presentation Rules

| Language | Metric | `score_label` | `cefr_level` | `band` | UI Presentation |
|---|---|---|---|---|---|
| **German (`de`)** | ZIX | `"ZIX"` | `"A1"`–`"C2"` | easy / ok / hard | Language badge `DE` + CEFR Badge (e.g. `B2 FORTGESCHRITTEN`) |
| **English (`en`)** | Flesch Reading Ease | `"CEFR"` | `"A1"`–`"C2"` | easy / ok / hard | Language badge `EN` + CEFR Badge (e.g. `B1 INTERMEDIATE`) |
| **French (`fr`)** | LIX | `"LIX"` | `null` | easy / ok / hard | Language badge `FR` + Metric (`LIX 45.8`) + Band (`EINFACH` / `MITTEL` / `SCHWIERIG`) |
| **Italian (`it`)** | Gulpease Index | `"Gulpease"` | `null` | easy / ok / hard | Language badge `IT` + Metric (`Gulpease 72.1`) + Band (`EINFACH` / `MITTEL` / `SCHWIERIG`) |
| **Inconclusive / Short** | ZIX (fallback) | `"ZIX"` | `"A1"`–`"C2"` | easy / ok / hard | Fallback / "Text zu kurz" if empty |
| **Unsupported (`es`, `zh`, etc.)** | None | `null` | `null` | `null` | Language badge (e.g. `ES`) + "Sprache nicht unterstützt" |

### 2.2 Server Dummy Fetcher (`server/api/text-analysis.post.ts`)

The server route dummy fetcher will be updated to detect language and return matching `TextAnalysisResult` objects based on simple heuristics (German, English, French, Italian, and unsupported language fallbacks), keeping mock development consistent with backend FastAPI endpoints.

### 2.3 Legacy Quick Action Retirement (`server/api/quick-action.post.ts`)

When `body.action === "plain_language"`, the route throws an HTTP 400 error (`createError({ statusCode: 400, statusMessage: "The plain_language quick action is retired. Use POST /simplify instead." })`).

### 2.4 UI Components

1. **`app/components/CefrScoreVisualization.vue`**:
   - Displays row label (`Sprachniveau (GER / CEFR)` for CEFR languages or `Lesbarkeit (LIX)` for non-CEFR languages).
   - Displays a detected language pill badge (e.g., `DE`, `EN`, `FR`, `IT`, `ES`) next to the label when `props.language` is present.
   - For unsupported languages, renders `emptyStateText` (`"Sprache nicht unterstützt"`).
   - For French/Italian, renders raw score and colored band badge (`ReadabilityScoreBadge`).
2. **`app/components/ReadabilityScoreBadge.vue`**:
   - Visualizes CEFR levels (`A1`–`C2`) or raw scores (`scoreText`) + band labels (`bandLabel`).
3. **`i18n/locales/de.json` & `i18n/locales/en.json`**:
   - Updated with `"cefr-level": "Sprachniveau (GER / CEFR)"`.
   - Added `"notSupported": "Sprache nicht unterstützt"` / `"Language not supported"`.
   - Updated descriptions clarifying GER vs CEFR.

---

## 3. Testing Strategy

1. **Unit Tests**:
   - `tests/assets/utils/textAnalysis.test.ts`: Verify `getTextAnalysis` client function with multi-language backend response payloads.
   - `tests/assets/composables/useCefrScore.test.ts`: Test multi-language handling, unsupported languages, error states, and debounce logic.
   - `tests/assets/composables/useSimplify.test.ts`: Ensure event handling (`start`, `progress`, `chunk_done`, `done`) and cancellation work seamlessly.
2. **Lint & Type Checks**:
   - Run `bun run lint` / `bun run check`.
   - Run `bun run tsc` (strict TypeScript validation).
   - Run full Vitest suite `bun run test`.
