import { describe, expect, it } from "vitest";
import { Node as PmNode, Schema } from "prosemirror-model";
import { Transform } from "prosemirror-transform";
import type { AdvisorThread } from "../../../app/assets/models/advisor";
import {
    advisorSegments,
    buildDecorationSpecs,
    clampOffset,
    offsetToPos,
    reflowAdvisorRanges,
    serializeAdvisorText,
} from "../../../app/utils/advisorText";

// Minimal schema mirroring the editor's Document > Paragraph > Text +
// HardBreak structure (HardBreak named exactly as Tiptap names it).
const schema = new Schema({
    nodes: {
        doc: { content: "block+" },
        paragraph: {
            group: "block",
            content: "inline*",
            toDOM: () => ["p", 0],
        },
        text: { group: "inline" },
        hardBreak: {
            group: "inline",
            inline: true,
            selectable: false,
            toDOM: () => ["br"],
        },
    },
});

function doc(...blocks: PmNode[]): PmNode {
    return schema.nodes.doc.create(null, blocks);
}

function p(...inline: PmNode[]): PmNode {
    return schema.nodes.paragraph.create(null, inline);
}

function text(value: string): PmNode {
    return schema.text(value);
}

function br(): PmNode {
    return schema.nodes.hardBreak.create();
}

describe("serializeAdvisorText", () => {
    it("serializes a single paragraph as its bare text", () => {
        expect(serializeAdvisorText(doc(p(text("abc"))))).toBe("abc");
    });

    it("joins paragraphs with a double newline (matching getText())", () => {
        expect(serializeAdvisorText(doc(p(text("ab")), p(text("cde"))))).toBe(
            "ab\n\ncde",
        );
    });

    it("renders a hard break as a single newline", () => {
        expect(serializeAdvisorText(doc(p(text("a"), br(), text("b"))))).toBe(
            "a\nb",
        );
    });

    it("keeps paragraph and hard-break separators distinct", () => {
        // paragraph 1 with a hard break, then paragraph 2
        expect(
            serializeAdvisorText(
                doc(p(text("x"), br(), text("y")), p(text("z"))),
            ),
        ).toBe("x\ny\n\nz");
    });
});

describe("advisorSegments", () => {
    it("emits an inter-paragraph separator with no DOM position (from === to)", () => {
        const d = doc(p(text("ab")), p(text("cd")));
        const separator = advisorSegments(d).find((s) => s.text === "\n\n");
        expect(separator).toBeDefined();
        expect(separator?.from).toBe(separator?.to);
    });

    it("does not emit a trailing separator after the last paragraph", () => {
        const d = doc(p(text("ab")), p(text("cd")));
        const texts = advisorSegments(d).map((s) => s.text);
        expect(texts.join("")).toBe("ab\n\ncd");
    });
});

/** Builds a minimal thread anchored to `[start, end)` over the given doc text. */
function threadAt(start: number, end: number): AdvisorThread {
    return {
        id: `t-${start}-${end}`,
        type: "violation",
        status: "to-fix",
        notes: [],
        range: { start, end },
    };
}

describe("offsetToPos at a paragraph boundary", () => {
    // Regression test: a range that starts exactly on a paragraph break (as
    // every multi-paragraph `unconverged_ranges` entry but the first does)
    // used to resolve to the synthetic "\n\n" separator segment instead of
    // the paragraph that follows, and silently return null — dropping the
    // whole decoration. See simplifyRanges.ts / T6.7.
    const d = doc(p(text("Hello world")), p(text("Second paragraph")));
    // Segments: "Hello world" (0..11), "\n\n" (11..13, synthetic), "Second
    // paragraph" (13..30).

    it("resolves an offset at the separator's trailing edge to the next paragraph, not null", () => {
        const segments = advisorSegments(d);
        const resolved = offsetToPos(segments, 13);
        expect(resolved).toEqual({ pos: 14, segmentIndex: 2 });
        // Should land inside "Second paragraph", not at the gap.
        const text2 = serializeAdvisorText(d);
        expect(text2.slice(13, 13 + 6)).toBe("Second");
    });

    it("still returns null for an offset strictly inside the separator", () => {
        const segments = advisorSegments(d);
        expect(offsetToPos(segments, 12)).toBeNull();
    });

    it("clampOffset resolves a paragraph-start offset via the same fix", () => {
        const segments = advisorSegments(d);
        expect(clampOffset(segments, 13)).not.toBeNull();
    });

    it("buildDecorationSpecs produces a decoration for a range starting exactly on a paragraph break", () => {
        const thread: AdvisorThread = {
            id: "t-boundary",
            type: "violation",
            status: "to-fix",
            notes: [],
            range: { start: 13, end: 30 }, // the whole second paragraph
        };
        const specs = buildDecorationSpecs(d, [thread], null);
        expect(specs.length).toBeGreaterThan(0);
        expect(specs.some((s) => s.id === "t-boundary")).toBe(true);
    });
});

describe("reflowAdvisorRanges", () => {
    it("keeps a range anchored to its word when text is inserted before it", () => {
        const oldDoc = doc(p(text("Hello world"))); // "world" = offset 6..11
        const tr = new Transform(oldDoc).insert(1, schema.text("XX")); // prefix
        const t = threadAt(6, 11);

        reflowAdvisorRanges(oldDoc, tr.doc, tr.mapping, [t]);

        expect(serializeAdvisorText(tr.doc).slice(t.range.start, t.range.end)).toBe(
            "world",
        );
        expect(t.range.start).toBeGreaterThanOrEqual(0);
    });

    it("leaves a range unchanged when text is inserted after it", () => {
        const oldDoc = doc(p(text("Hello world")));
        const tr = new Transform(oldDoc).insert(12, schema.text("YY")); // after "d"
        const t = threadAt(6, 11);

        reflowAdvisorRanges(oldDoc, tr.doc, tr.mapping, [t]);

        expect(t.range).toEqual({ start: 6, end: 11 });
    });

    it("flags a range for auto-dismiss when its text is deleted", () => {
        const oldDoc = doc(p(text("Hello world")));
        const tr = new Transform(oldDoc).delete(7, 12); // remove "world"
        const t = threadAt(6, 11);

        reflowAdvisorRanges(oldDoc, tr.doc, tr.mapping, [t]);

        expect(t.range.start).toBe(-1);
        expect(t.range.end).toBe(-1);
    });

    // Regression test: typing a replacement over a fully-selected marked
    // range (the "user rewrites a flagged passage by hand" gesture the whole
    // auto-dismiss mechanism exists for) used to leave a spurious
    // one-character sliver of the range alive instead of dismissing it,
    // because — unlike a pure deletion — the mapped positions of a
    // same-size-or-larger replacement don't collapse to the same point.
    it("flags a range for auto-dismiss when its text is replaced by a single typed character", () => {
        const oldDoc = doc(p(text("Hello world")));
        // Model "select 'world' and type 'x'" as delete-then-insert, exactly
        // how ProseMirror represents replacing a selection.
        const tr = new Transform(oldDoc).delete(7, 12).insert(7, schema.text("x"));
        const t = threadAt(6, 11);

        reflowAdvisorRanges(oldDoc, tr.doc, tr.mapping, [t]);

        expect(t.range.start).toBe(-1);
        expect(t.range.end).toBe(-1);
    });

    it("flags a range for auto-dismiss when its text is replaced by longer text", () => {
        const oldDoc = doc(p(text("Hello world")));
        const tr = new Transform(oldDoc)
            .delete(7, 12)
            .insert(7, schema.text("everybody"));
        const t = threadAt(6, 11);

        reflowAdvisorRanges(oldDoc, tr.doc, tr.mapping, [t]);

        expect(t.range.start).toBe(-1);
        expect(t.range.end).toBe(-1);
    });

    it("does not dismiss a range when only its interior is edited (insert not touching either boundary)", () => {
        const oldDoc = doc(p(text("Hello good old world")));
        // Range covers "good old world" (offset 6..20); insert new text in
        // its interior, away from both boundaries.
        const t = threadAt(6, 20);
        const tr = new Transform(oldDoc).insert(12, schema.text("REALLY ")); // inside "good [old world"
        reflowAdvisorRanges(oldDoc, tr.doc, tr.mapping, [t]);

        expect(t.range.start).not.toBe(-1);
        const newText = serializeAdvisorText(tr.doc);
        expect(newText.slice(t.range.start, t.range.end)).toContain("REALLY");
    });

    it("does not dismiss a range when only a small deletion touches its interior", () => {
        const oldDoc = doc(p(text("Hello good old world")));
        const t = threadAt(6, 20); // "good old world"
        // Delete " old" (positions 11..15 in PM terms — mid-range, not
        // touching either boundary).
        const tr = new Transform(oldDoc).delete(11, 15);
        reflowAdvisorRanges(oldDoc, tr.doc, tr.mapping, [t]);

        expect(t.range.start).not.toBe(-1);
        const newText = serializeAdvisorText(tr.doc);
        expect(newText.slice(t.range.start, t.range.end)).toBe("good world");
    });
});
