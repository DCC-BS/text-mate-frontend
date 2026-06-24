# Advisor v2 — Backend changes (text-mate-backend)

This document describes the backend work required to move the **Advisor v2**
(Word-style threaded comments) experience off mock data and onto the real
[`text-mate-backend`](https://github.com/DCC-BS/text-mate-backend).

The frontend already ships:

- A new page at `/advisor-v2` (compare against the classic Advisor panel).
- Two Nuxt server proxy endpoints with **dummy fetchers** so the whole flow runs
  today in dummy mode (`DUMMY=true`, e.g. `bun run dummy`):
  - `server/api/advisor-v2/check.post.ts` → proxies to backend `/advisor/check`
  - `server/api/advisor-v2/fix.post.ts` → proxies to backend `/advisor/fix`

When the backend endpoints below exist, the real fetchers (`withRawFetcher`)
already point at the right paths — no further frontend wiring is needed.

---

## Why new endpoints (vs. the existing `/advisor/validate`)

The classic flow uses `POST /advisor/validate`, which streams
`AdvisorRuleViolation` objects **without** a text position. The v2 UI renders
each violation as an inline mark anchored to the exact characters it applies to,
and as a comment card in a right-hand rail. That requires two things the current
contract does not provide:

1. **Character ranges** for every violation, so the frontend can place marks and
   connector lines without re-scanning the text (which is brittle for repeated
   words).
2. **A single-pass "apply fixes" endpoint** that rewrites the whole document
   from the user's accepted/edited comments — the model produces the corrected
   text; the client never splices offsets itself.

You may either add these as **new** endpoints (`/advisor/check`, `/advisor/fix`)
or extend `/advisor/validate` with ranges and add `/advisor/fix`. The frontend
currently expects the two new paths.

---

## 1. `POST /advisor/check` — streaming violations with ranges

Same inputs as `/advisor/validate`.

### Request

```jsonc
{
  "text": "Der Mitarbeiter schreibt dem Bürger ...",
  "docs": ["beispiel-collection", "..."]   // 1–5 collection ids
}
```

### Response — `text/event-stream`

One SSE block per chunk (`data: <json>\n\n`), streamed as violations are found.
Each violation **must** include a `range` of character offsets into the
submitted `text`.

```jsonc
// data:
{
  "violations": [
    {
      "range": { "start": 4, "end": 15 },   // offsets into `text`
      "rule_name": "Verbot des generischen Maskulinums",
      "collection": "Geschlechtergerechte Sprache",
      "reason": "Die alleinige Verwendung der männlichen Form ...",
      "proposal": "Verwenden Sie eine Paarform: ...",
      "file_name": "leitfaden_...pdf",
      "page_number": 7
    }
  ],
  "checked": 1,    // optional progress counter
  "total": 4       // optional progress total
}
```

A terminal chunk with an empty `violations` array signals completion (the dummy
fetcher does this).

### Range contract (important)

- `start`/`end` are **0-based character offsets** into the exact `text` string
  received in the request (`end` exclusive).
- The frontend reconstructs the document as **one paragraph per `\n`** and maps
  these offsets to editor positions. Offsets must therefore be computed against
  the raw text **with single `\n` line separators** — do not normalise newlines
  or collapse whitespace before computing offsets.
- Ranges should not overlap for a single logical violation; multiple distinct
  violations may overlap (the UI handles that).

### Frontend types

See `app/types/advisorV2.ts` → `AdvisorCheckChunk` / `AdvisorCheckViolation`.

---

## 2. `POST /advisor/fix` — single-pass rewrite, streamed

Receives the full text plus only the threads the user marked **to-fix**
(violations the user kept, plus any free-text comments they added). The model
rewrites the **entire document in one pass** and streams the corrected text
back. The client then diffs original vs. corrected and lets the user
accept/reject individual changes.

### Request

```jsonc
{
  "text": "Der Mitarbeiter schreibt dem Bürger ...",
  "threads": [
    {
      "snippet": "Mitarbeiter",        // the text the violation/comment covers
      "rule_name": "Verbot des generischen Maskulinums",
      "reason": "...",
      "proposal": "...",
      "notes": [                          // user comments steering the fix
        "Bitte die ausgeschriebene Paarform verwenden, keinen Doppelpunkt."
      ]
    }
  ]
}
```

Notes:

- Only `to-fix` threads are sent. `skip`/ignored threads are omitted entirely.
- `notes` carries the user's free-text comments/replies and should be treated as
  **instructions** that take priority over the generic rule proposal.
- Deliberately **no rule definitions / full ruleset** are sent — only the
  grounding needed to apply the already-identified fixes.

### Response — `text/plain; charset=utf-8` (streamed/chunked)

Stream the corrected **full document text** as plain UTF-8 chunks (token by
token is fine — see the existing `/quick-action` streaming for the pattern). The
frontend concatenates all chunks into the final corrected text.

> The response is the corrected text only — not a diff. The frontend computes the
> word-level diff client-side (`useAdvisorDiff`) for the per-hunk accept/reject UI.

### Frontend types

See `app/types/advisorV2.ts` → `AdvisorFixRequest` / `AdvisorFixThread`, and the
streaming client `app/assets/services/AdvisorV2Service.ts`.

---

## 3. Suggested backend models / agent

Mirroring the existing advisor agent structure:

- `FixThread` / `FixRequest` pydantic models matching the request shape above.
- An `AdvisorFixAgent` that, given the text + to-fix threads, returns the fully
  corrected document in a single LLM call, honouring `notes` as overriding
  instructions. Stream the result.
- Extend the check agent (or add `AdvisorCheckAgent`) to emit a `range` for each
  violation. The cheapest reliable approach is to have the model/return pipeline
  report the matched substring and its offset, or to locate the reported snippet
  in the source text server-side and attach the offset before streaming.

## 4. Auth / proxy

Both endpoints go through the same authenticated proxy (`apiHandler` →
`authHandler`) as `/advisor/validate`, so no new auth handling is required — the
raw fetchers already forward to `/advisor/check` and `/advisor/fix`.

## 5. Checklist

- [ ] `POST /advisor/check` streaming SSE with `range` per violation.
- [ ] `POST /advisor/fix` streaming corrected full text from to-fix threads.
- [ ] Ranges computed against raw text with single `\n` separators.
- [ ] `FixRequest` / `FixThread` models + `AdvisorFixAgent`.
- [ ] Remove the frontend dummy fetchers (or rely on `DUMMY` flag) once live.
