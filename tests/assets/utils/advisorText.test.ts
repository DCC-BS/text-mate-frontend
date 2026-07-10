import { describe, expect, it } from "vitest";
import { Node as PmNode, Schema } from "prosemirror-model";
import { Transform } from "prosemirror-transform";
import type { AdvisorThread } from "../../../app/assets/models/advisor";
import {
    advisorSegments,
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
});
