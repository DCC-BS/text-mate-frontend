# TextMate

An AI-assisted application for transforming and validating text. The user authors text in an editor, then either rewrites it (transformations) or checks it against reference documents (validation). This glossary captures the language shared across the team and the product's two workspaces.

## Language

### Core

**Tool**:
One of the two top-level workspaces the user can be in at any time. Values: **Rewrite**, **Advisor**. Switching tool is the primary navigation act and gates whether the editor is editable.
_Avoid_: mode, view, tab

**Working Text** _(provisional — see Open Questions)_:
The text currently open in the editor that all transformations and checks operate on.
_Avoid_: document, content, the text

**Editor**:
The rich-text surface where the Working Text is authored and displayed.

**Editor Lock**:
The read-only state of the Editor, enforced while the Advisor tool is active.

**Diff Hunk**:
A single contiguous change between an original and a transformed text, presented to the user for an individual accept/reject decision.
_Avoid_: change, edit, delta

### Transformations (Rewrite tool)

**Rewrite Tool**:
The workspace for transforming the Working Text.
_Avoid_: the rewriter

**Quick Action**:
A predefined, one-click AI transformation applied to the whole Working Text. Built-in Quick Actions: **Summarize**, **Bullet Points**, **Formality**, **Medium**, **Social Media**, **Character Speech**, **Plain Language**, **Proofread**; plus a free-form **Custom** action.
_Avoid_: action, operation (when unqualified)

**Text Rewrite**:
A transformation that rewrites a selected passage according to adjustable style, audience, and intent options.
_Avoid_: paraphrase, rephrase

**Sentence Rewrite**:
A transformation that produces several alternative phrasings for a single sentence, using its surrounding context.

**Word Synonym**:
A transformation that suggests context-aware synonyms for a single word.

### Validation (Advisor tool)

**Advisor Tool**:
The workspace for validating the Working Text against one or more Reference Documents.
_Avoid_: checker, linter

**Check**:
The act of running validation against the selected Reference Documents.
_Avoid_: validate (backend term), review, scan

**Validation Result**:
The outcome of a Check: a set of Violations plus how much text was examined.

**Reference Document**:
A PDF document whose rules the Working Text is checked against. In the Advisor tool, a Reference Document serves as a **Ruleset**; up to five may be selected.
_Avoid_: doc, file, source document

**Ruleset**:
The set of rules contributed by one or more selected Reference Documents.
_Avoid_: rule collection

**Rule**:
A named constraint within a Reference Document that the Working Text can Violate.
_Avoid_: check, lint rule

**Collection** _(provisional — see Open Questions)_:
A grouping of related Rules within a Reference Document.

**Violation**:
An instance where the Working Text breaks a Rule. Carries a Reason, a Proposal, a Source, a page reference, and a Range.
_Avoid_: error, issue, finding, problem

**Reason**:
The Advisor's explanation of why the Working Text Violates a Rule.

**Proposal**:
The Advisor's suggested replacement for a Violation. Free-form prose — not guaranteed to be a drop-in replacement.
_Avoid_: fix, suggestion, correction

**Source**:
The quoted passage from a Reference Document that backs a Violation.
_Avoid_: citation, quote

**Range**:
A half-open character span `[start, end)` into the Working Text that a Violation or Thread refers to.

**Thread**:
The unit of curation in the Advisor rail. Anchored to a Range, carries a status and Notes. Either a **Violation Thread** or a **User Thread**.
_Avoid_: comment (use for the act of replying), annotation

**Violation Thread**:
A Thread seeded from a Violation; its first Note carries the Advisor's Reason and Proposal.

**User Thread**:
A Thread the user creates by selecting a Range in the Editor.
_Avoid_: user comment, manual note

**Note**:
A reply within a Thread. Authored either by the Advisor or the user.
_Avoid_: message, reply (use for the act)

**Status**:
The per-Thread decision of whether to include it in the Fix. Values: **to-fix**, **skip**.

**Fix**:
The Advisor-produced, fully corrected Working Text that applies every to-fix Thread. Computed in one pass; the user then accepts or rejects per Diff Hunk.
_Avoid_: correction, auto-fix, patch

**Phase**:
The lifecycle stage of an Advisor round: **edit → reviewing → review → fixing → diff → done**.

### Readability & vocabulary

**Text Statistics**:
Readability metrics computed for the Working Text.
_Avoid_: stats, metrics (when unqualified)

**ZIX Score**:
An understandability score on a scale from -10 to 10. `null` when the text is too short to score.

**CEFR Level**:
A reading-difficulty level on the Common European Framework scale (A1–C2). `null` when it cannot be computed.

**Flesch Score**:
A Flesch reading-ease readability score for the Working Text.

**User Dictionary**:
A personal store of specialized vocabulary that transformations should respect.
_Avoid_: glossary, word list

## Open Questions

These terms are ambiguous or overloaded in the current codebase and need a decision before they can be pinned down here:

1. **"Working Text" is invented.** The codebase has no canonical name for the text being edited — it is variously "the text", "editor text", and (confusingly) "document". Confirm or replace.
2. **"Document" is overloaded.** It means both a *Reference Document* (ruleset) and, informally, the Working Text. We propose reserving **Document** for Reference Document only.
3. **"Rewrite" is overloaded.** It names the Tool *and* a specific transformation (Text Rewrite), alongside Sentence/Word variants. Confirm whether "Rewrite Tool" vs "Text Rewrite" is a clear enough split.
4. **"Advisor" is overloaded.** It names the Tool *and* the AI agent that authors Notes *and* acts as a system label. Decide whether the agent deserves its own term (e.g., "Assistant").
5. **"Collection"** (grouping of Rules) appears only as a field on Violations; its relationship to Rule and Reference Document is unspecified.
6. **Check vs Validate vs Review** are used interchangeably for the same act. We propose **Check** as the canonical verb.
