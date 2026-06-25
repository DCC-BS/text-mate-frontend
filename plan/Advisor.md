#project/textmate 

# Advisor Rework — Design

Give the user a good UX: select a ruleset (document) to test against the text, see what the LLM recommends, and apply changes.

## Problem (original)
When fixing one violation, the source text changes and all other violations' absolute char offsets (`start`/`end`) become stale. Applying proposals client-side at fragile offsets is unreliable — and `proposal` is free-form prose, not a guaranteed drop-in replacement (`text-mate-backend/src/text_mate_backend/models/rule_models.py:27`).

## Solution
An **LLM applies the fixes**, not the client. One fix-LLM call takes the text + the selected comments and returns a full corrected text; the frontend diffs it and the user accepts/rejects per hunk. This sidesteps offset bookkeeping entirely.

## Locked decisions
| # | Decision | Choice |
|---|---|---|
| 1 | Staleness on fix | Don't splice proposals client-side — an **LLM applies the fixes** |
| 2 | Fix-LLM shape | **One call → full corrected text** |
| 3 | Post-apply | **Terminal**: text updated, comments cleared, **manual re-check** only |
| 4 | Mode gating | Existing **Rewrite ↔ Advisor toggle** = the lock: Advisor active ⇒ editor **read-only** |
| 5 | Comments | **Word-style threaded comments** in a right rail; user can add notes/replies |
| 6 | Ruleset | **Document = ruleset** (keep current `AdvisorDocSelect`, max 5) |
| 7 | Threading | Thread w/ replies, **thread-level** to-fix/skip, **full context** to LLM |
| 8 | Diff | **Per-hunk accept/reject**, reuse `RewriteDiffViewer` pattern |
| 9 | Fix transport | **Stream corrected text over SSE**; diff computed client-side on completion |
| 10 | Fix input | **Text + to-fix threads only** (no rule defs); skip threads excluded |

## Data model — the unified "thread"
```
Thread {
  id, range{start,end}, type: "violation" | "user",
  status: "to-fix" | "skip",
  // violation-only:
  rule_name?, reason?, proposal?, file_name?, page_number?,
  // both:
  notes: [ { text } ]   // violation's reason/proposal = implicit first context;
                        // user replies append here
}
```
- One status per thread (to-fix/skip). Skip ⇒ excluded from the fix payload.
- Fix-LLM receives, per to-fix thread: `source` + `proposal`/`reason` (violations) + **all notes**.

## End-to-end flow
1. **Rewrite/Edit** (editable editor) → user writes text.
2. Switch to **Advisor** → editor locks **read-only**, comments rail shows.
3. Pick documents (ruleset) → **Check** (existing SSE stream, unchanged).
4. Violations land as **comment threads** in the rail, ranges marked inline.
5. User curates: **adds own comments** (select range → bubble "Add comment"), **replies to threads** (Word-style notes), toggles each thread **to-fix/skip**.
6. **Apply** → stream corrected text from `/advisor/fix` → on completion, diff vs original.
7. Per-hunk **accept/reject** (reuse `RewriteDiffViewer` + `RegisterDiffCommand`/`ApplyTextCommand`).
8. **Accept** → editor text updated, threads cleared, round done (read-only stays for a manual **Check**). **Reject** → comments stay, adjust & re-apply.

## Backend changes (greenfield)
- **Models** (`models/fix_models.py`): `FixThread`, `FixRequest{text, threads}`.
- **Agent** (`agents/agent_types/advisor_fix_agent.py`): `AdvisorFixAgent(BaseAgent)`, `output_type=str`, `enable_thinking=True`. Prompt: "output ONLY the corrected full text; apply the listed thread fixes; change nothing else; preserve language." Mirror `SentenceRewriteAgent`.
- **Endpoint** (`routers/advisor.py`): `POST /advisor/fix` → SSE of text deltas + `event: done` (same generator pattern as `validate`, `advisor.py:63-87`).
- **Frontend proxy**: `server/api/advisor/fix.post.ts` (+ dummy fetcher for `DUMMY` mode), mirroring `validate.post.ts:5-21`.
- **Input**: `text` + to-fix threads only (no rule defs). 60s timeout like validate.

## Frontend changes
- **State**: introduce a **Pinia `useAdvisorStore`** (Pinia is installed but unused, `nuxt.config.ts:83`) holding `threads[]` — the editor (marks), rail, and diff all need shared thread state; cleaner than prop-drilling through the command bus. Flag: this is the first real Pinia usage.
- **Rewrite `AdvisorView.vue`** into a rail: doc-select + Check + progress at top; thread cards (sorted by `start`) in the middle — header (type icon + rule name / "Note"), source snippet, reason/proposal, threaded notes + reply input, to-fix/skip toggle, PDF link; sticky footer `Apply (N)`, disabled when `N=0`.
- **Read-only gating**: on Advisor tool activation, dispatch `ToggleLockEditorCommand` (exists, `commands.ts`) / set `lockEditor`; unlock on switching away.
- **Editor marks**: render **all** thread ranges marked at once (extend `advisorViolationMark.ts:7` or add a `CommentMark`); focused thread bold; bidirectional click-sync (mark→rail card, card→scroll+highlight, reusing the `AdvisorHighlightCommand` handler at `useTextEditor.ts:169`).
- **Add-comment**: selection in read-only editor → floating button (bubble-menu pattern) → popover textarea → new user `Thread`. If selection overlaps an existing thread range → offer **"reply"** instead of a new thread.
- **Diff**: `AdvisorService.fix(text, threads, signal)` async-generator accumulating the stream; on completion `diffWords(original, corrected)` → render a diff viewer mirroring `RewriteDiffViewer.vue:118` (apply-all / undo-all / per-hunk undo). On accept → `ApplyTextCommand`, clear store.

## Edge cases (to handle)
- Reload ⇒ threads lost (in-memory, matches today; localStorage persistence = possible v2).
- Switch to Rewrite mid-review then back ⇒ comments may be stale → show "text changed — re-check."
- Fix-LLM returns unchanged/empty ⇒ "no changes could be applied," threads stay.
- Overlapping selections ⇒ reply-vs-new-thread heuristic.
- No to-fix threads ⇒ Apply disabled.

## Suggested phasing
- **Phase 0 (backend):** `FixThread`/`FixRequest`, `AdvisorFixAgent` + prompt, `POST /advisor/fix` SSE, proxy route + dummy fetcher, tests.
- **Phase 1 (rail + read-only):** Pinia store, rewrite `AdvisorView` to render violation threads + status toggle + PDF link + click-sync, editor lock-on-tool-switch, all-range comment marks.
- **Phase 2 (user comments):** selection→add-comment bubble, create user threads, reply/threading (notes).
- **Phase 3 (apply + diff):** `AdvisorService.fix` streaming, diff viewer (mirror `RewriteDiffViewer`), per-hunk accept/reject, on-accept clear+update, empty/error states.

## Still open (minor)
- Bulk "mark all to-fix / all skip" actions?
- Let the user **edit a violation's proposal** directly, or only refine via notes?
- Persist threads across reload (v1 vs v2)?
- Thread mark color: single, or per-type/per-collection?

## Phase notes (original brainstorm)
- Phase 1: analyse text — gather all violations, list them, maybe recommend what to fix.
- Phase 2: user decides what to change.
- Phase 3: text is changed — user sees what is changed, can approve or reject.
