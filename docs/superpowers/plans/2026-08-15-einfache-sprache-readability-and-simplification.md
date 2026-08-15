# Implementation Plan: Multi-Language Readability & Simplification Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update TextMate frontend with multi-language readability analysis (`de`, `en`, `fr`, `it`), clarify "GER / CEFR" terminology, retire `plain_language` quick action with HTTP 400, and ensure complete integration with the NDJSON simplify pipeline.

**Architecture:** Update server proxy dummy fetchers and validation routes, standardize TypeScript models for text analysis, update UI components (`CefrScoreVisualization.vue`, `ReadabilityScoreBadge.vue`) to render language pill badges and calibrated band ratings, and update localization dictionaries.

**Tech Stack:** Nuxt 4, Vue 3 (Composition API `<script setup lang="ts">`), TypeScript (strict mode), Tailwind CSS, Nuxt UI, Vitest.

## Global Constraints
- Composition API exclusively with `<script setup lang="ts">` and function declarations only (no arrow functions for top-level/named functions).
- Never use `any` — use specific types, `unknown`, or `never`.
- Run `bun run check`, `bun run tsc`, and `bun run test` to verify changes.
- 4-space indentation, double quotes, and semicolons as per Biome rules.

---

### Task 1: Update Localization Keys & Terminology

**Files:**
- Modify: `i18n/locales/de.json`
- Modify: `i18n/locales/en.json`

**Interfaces:**
- Produces: i18n translation keys `flesch-score.cefr-level`, `simplify.notSupported`

- [ ] **Step 1: Update `i18n/locales/de.json`**

Update `flesch-score` and `simplify` entries in `i18n/locales/de.json`:
```json
    "flesch-score": {
        "easy": "Einfach",
        "standard": "Standard",
        "difficult": "Schwer",
        "academic": "Akademisch",
        "reading-ease": "Lesbarkeit (Flesch Index)",
        "score": "Bewertung",
        "cefr-level": "Sprachniveau (GER / CEFR)",
        "cefr-loading": "Sprachniveau wird berechnet...",
        "cefr-description": "Das Sprachniveau nach dem Gemeinsamen Europäischen Referenzrahmen (GER / CEFR) beschreibt die sprachliche Verständlichkeit von A1 (sehr einfach) bis C2 (sehr komplex).",
        "cefr-too-short": "Text zu kurz für Analyse",
        "cefr-level-a1": "Sehr einfach",
        "cefr-level-a2": "Einfach",
        "cefr-level-b1": "Mittel",
        "cefr-level-b2": "Fortgeschritten",
        "cefr-level-c1": "Stark fortgeschritten",
        "cefr-level-c2": "Nahezu muttersprachlich"
    },
```
And under `simplify`:
```json
        "notScored": "Für diese Sprache nicht bewertbar",
        "notSupported": "Sprache nicht unterstützt",
```

- [ ] **Step 2: Update `i18n/locales/en.json`**

Update `flesch-score` and `simplify` entries in `i18n/locales/en.json`:
```json
    "flesch-score": {
        "easy": "Easy",
        "standard": "Standard",
        "difficult": "Difficult",
        "academic": "Academic",
        "reading-ease": "Reading Ease (Flesch Index)",
        "score": "Score",
        "cefr-level": "Language Level (CEFR)",
        "cefr-loading": "Calculating language level...",
        "cefr-description": "The CEFR level (Common European Framework of Reference for Languages) describes linguistic understandability from A1 (very simple) to C2 (very complex).",
        "cefr-too-short": "Text too short for analysis",
        "cefr-level-a1": "Very simple",
        "cefr-level-a2": "Simple",
        "cefr-level-b1": "Intermediate",
        "cefr-level-b2": "Upper Intermediate",
        "cefr-level-c1": "Advanced",
        "cefr-level-c2": "Very advanced"
    },
```
And under `simplify`:
```json
        "notScored": "Not scored for this language",
        "notSupported": "Language not supported",
```

- [ ] **Step 3: Run Biome check to ensure JSON is valid**

Run: `bun run check`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add i18n/locales/de.json i18n/locales/en.json
git commit -m "i18n: clarify CEFR terminology and add unsupported language key"
```

---

### Task 2: Update Server Endpoints & Dummy Fetchers

**Files:**
- Modify: `server/api/quick-action.post.ts`
- Modify: `server/api/text-analysis.post.ts`

**Interfaces:**
- Consumes: `TextAnalysisResult`, `SimplifyInput`
- Produces: HTTP 400 for `plain_language` on `POST /quick-action`, multi-language dummy output on `POST /text-analysis`

- [ ] **Step 1: Update `server/api/quick-action.post.ts` to reject `plain_language`**

Modify `server/api/quick-action.post.ts`:
```ts
    switch (body.action) {
        case "plain_language":
            throw createError({
                statusCode: 400,
                statusMessage:
                    "The plain_language quick action is retired. Use POST /simplify instead.",
            });
        default:
            dummyText = `Action: ${body.action}, Input: ${body.text}, Options: ${body.options}`;
            break;
    }
```

- [ ] **Step 2: Update `server/api/text-analysis.post.ts` to provide multi-language dummy analysis**

Modify `server/api/text-analysis.post.ts`:
```ts
import type { TextAnalysisResult } from "~/assets/models/text-analysis";
import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";

type BodyType = {
    text: string;
};

/** Stopwords used for dummy language detection */
const DUMMY_STOPWORDS: Record<string, string[]> = {
    de: ["der", "die", "das", "und", "ist", "nicht", "sie", "für", "mit"],
    en: ["the", "and", "is", "of", "to", "you", "with", "for", "this"],
    fr: ["le", "la", "les", "et", "est", "vous", "pour", "des", "une"],
    it: ["il", "la", "e", "che", "di", "per", "sono", "con", "non"],
};

function detectDummyLanguage(text: string): string | null {
    const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
    if (words.length < 3) {
        return null;
    }

    const scores = Object.entries(DUMMY_STOPWORDS).map(([lang, stopwords]) => ({
        lang,
        hits: words.filter((w) => stopwords.includes(w)).length,
    })).sort((a, b) => b.hits - a.hits);

    const top = scores[0];
    if (top && top.hits > 0) {
        return top.lang;
    }
    return null;
}

function dummyFetcher(options: FetcherOptions<BodyType>): TextAnalysisResult {
    const text = options.body.text ?? "";
    if (text.trim().length === 0) {
        return {
            language: null,
            score: null,
            score_label: null,
            band: null,
            cefr_level: null,
            zix_score: null,
        };
    }

    const lang = detectDummyLanguage(text);
    if (lang === null) {
        return {
            language: null,
            score: null,
            score_label: null,
            band: null,
            cefr_level: null,
            zix_score: null,
        };
    }

    if (lang === "de") {
        return {
            language: "de",
            score: 1.5,
            score_label: "ZIX",
            band: "easy",
            cefr_level: "B2",
            zix_score: 1.5,
        };
    }

    if (lang === "en") {
        return {
            language: "en",
            score: 68.2,
            score_label: "CEFR",
            band: "easy",
            cefr_level: "B1",
            zix_score: null,
        };
    }

    if (lang === "fr") {
        return {
            language: "fr",
            score: 38.5,
            score_label: "LIX",
            band: "easy",
            cefr_level: null,
            zix_score: null,
        };
    }

    if (lang === "it") {
        return {
            language: "it",
            score: 75.0,
            score_label: "Gulpease",
            band: "ok",
            cefr_level: null,
            zix_score: null,
        };
    }

    return {
        language: lang,
        score: null,
        score_label: null,
        band: null,
        cefr_level: null,
        zix_score: null,
    };
}

/**
 * Nuxt API route for text analysis.
 * Proxies POST requests to `/text-analysis` on the FastAPI backend.
 */
export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>()
    .withDummyFetcher(dummyFetcher)
    .build("/text-analysis");
```

- [ ] **Step 3: Run checks**

Run: `bun run check && bun run tsc`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/api/quick-action.post.ts server/api/text-analysis.post.ts
git commit -m "server: retire plain_language quick action and add multi-language text-analysis dummy"
```

---

### Task 3: Update Types, Client Model, and Unit Tests

**Files:**
- Modify: `app/assets/models/text-analysis.ts`
- Modify: `tests/assets/utils/textAnalysis.test.ts`
- Modify: `tests/assets/composables/useCefrScore.test.ts`

**Interfaces:**
- Produces: `TextAnalysisResult` type definition

- [ ] **Step 1: Update `app/assets/models/text-analysis.ts`**

Ensure `TextAnalysisResult` matches the backend specification:
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

- [ ] **Step 2: Update `tests/assets/utils/textAnalysis.test.ts` with multi-language test cases**

Update test cases in `tests/assets/utils/textAnalysis.test.ts` to test German, English, French, and unsupported language payloads.

- [ ] **Step 3: Update `tests/assets/composables/useCefrScore.test.ts`**

Add tests for non-CEFR languages (French/Italian with band and score_label) and unsupported languages (language code present, score null).

- [ ] **Step 4: Run unit tests**

Run: `bun run test -- tests/assets/utils/textAnalysis.test.ts tests/assets/composables/useCefrScore.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/assets/models/text-analysis.ts tests/assets/utils/textAnalysis.test.ts tests/assets/composables/useCefrScore.test.ts
git commit -m "types: update TextAnalysisResult and expand composable tests for multi-language"
```

---

### Task 4: Update UI Readability Visualization Components

**Files:**
- Modify: `app/components/CefrScoreVisualization.vue`
- Modify: `app/components/ReadabilityScoreBadge.vue`

**Interfaces:**
- Consumes: `ReadabilityScore`, `ReadabilityBand`, language string

- [ ] **Step 1: Update `app/components/CefrScoreVisualization.vue`**

Add language pill badge display and ensure clear rendering for:
1. German/English: CEFR level + descriptor badge.
2. French/Italian: Metric label (`LIX` / `Gulpease`) + score + band label.
3. Unsupported languages (e.g. `es`, `zh`): Language badge + `"Sprache nicht unterstützt"`.

```vue
<script setup lang="ts">
import ReadabilityScoreBadge from "~/components/ReadabilityScoreBadge.vue";
import { isUnscored, type ReadabilityScore } from "~/utils/readability";
import type { ReadabilityBand } from "~~/shared/types/simplify";

const { t } = useI18n();

const props = defineProps<{
    isLoading: boolean;
    cefrLevel?: string;
    language?: string;
    score?: number;
    scoreLabel?: string;
    band?: ReadabilityBand;
    error?: string;
}>();

const scoreValue = computed<ReadabilityScore>(() => ({
    scored: props.cefrLevel !== undefined || props.score !== undefined,
    language: props.language,
    scoreLabel: props.scoreLabel,
    score: props.score,
    band: props.band,
    cefr: props.cefrLevel,
}));

const hasNothingToShow = computed<boolean>(() => isUnscored(scoreValue.value));

const rowLabel = computed<string>(() => {
    if (props.cefrLevel === undefined && props.scoreLabel !== undefined) {
        return t("simplify.readability", { label: props.scoreLabel });
    }
    return t("flesch-score.cefr-level");
});

const rowDescription = computed<string>(() =>
    props.cefrLevel === undefined && props.scoreLabel !== undefined
        ? t("simplify.readabilityDescription")
        : t("flesch-score.cefr-description"),
);

const emptyStateText = computed<string>(() =>
    props.language !== undefined
        ? t("simplify.notSupported")
        : t("flesch-score.cefr-too-short"),
);
</script>

<template>
    <div
        class="mt-4 pt-3 border-t border-default flex items-center justify-between text-sm"
    >
        <div class="flex items-center gap-2">
            <UTooltip :text="rowDescription">
                <span
                    class="text-xs font-medium text-muted cursor-help hover:text-default"
                >
                    {{ rowLabel }}
                </span>
            </UTooltip>
            <span
                v-if="props.language"
                class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-muted/20 text-muted"
                data-testid="detectedLanguageBadge"
            >
                {{ props.language }}
            </span>
        </div>

        <div v-if="props.error" class="text-xs text-error font-medium">
            {{ props.error }}
        </div>

        <div v-else-if="props.isLoading" class="py-0.5">
            <USkeleton class="h-4 w-[60px]" />
        </div>

        <div v-else-if="hasNothingToShow" class="text-xs text-muted italic">
            {{ emptyStateText }}
        </div>

        <ReadabilityScoreBadge v-else :value="scoreValue" />
    </div>
</template>
```

- [ ] **Step 2: Run Biome check & type check**

Run: `bun run check && bun run tsc`  
Expected: PASS

- [ ] **Step 3: Run Vitest tests**

Run: `bun run test`  
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add app/components/CefrScoreVisualization.vue app/components/ReadabilityScoreBadge.vue
git commit -m "feat(ui): add language badge and improve non-CEFR and unsupported language display"
```

---

### Task 5: Final Validation & Integration Verification

**Files:**
- All changed files

- [ ] **Step 1: Run full unit test suite**

Run: `bun run test`  
Expected: All 128+ tests PASS

- [ ] **Step 2: Run full TypeScript type checking**

Run: `bun run tsc`  
Expected: 0 errors

- [ ] **Step 3: Run Biome linter and formatter**

Run: `bun run check`  
Expected: No lint or formatting issues

- [ ] **Step 4: Commit final verification adjustments if any**

```bash
git status
```
