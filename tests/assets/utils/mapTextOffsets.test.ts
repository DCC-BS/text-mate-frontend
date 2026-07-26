import { describe, expect, it } from "vitest";
import { Node as PmNode, Schema } from "prosemirror-model";
import { mapTextOffsetsToDocPositions } from "../../../app/utils/mapTextOffsets";

// Minimal schema mirroring the editor's Document > Paragraph > Text + HardBreak
// structure, with HardBreak named exactly as Tiptap names it.
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

/**
 * `editor.getText()` joins blocks with `"\n\n"` and renders HardBreak as
 * `"\n"`. Reconstruct that serialisation so tests assert against the same
 * string the diff viewer diffs.
 */
function getText(docNode: PmNode): string {
    const blocks: string[] = [];
    docNode.forEach((block) => {
        let blockText = "";
        block.forEach((child) => {
            if (child.isText && child.text) {
                blockText += child.text;
            } else if (child.type.name === "hardBreak") {
                blockText += "\n";
            }
        });
        blocks.push(blockText);
    });
    return blocks.join("\n\n");
}

describe("mapTextOffsetsToDocPositions", () => {
    it("maps offsets within a single paragraph (accounts for the +1 opening token)", () => {
        const d = doc(p(text("abc")));
        // string "abc": offset 0 = "a", 1 = "b", 2 = "c"
        expect(mapTextOffsetsToDocPositions(d, 0, 1)).toEqual({ from: 1, to: 2 });
        expect(mapTextOffsetsToDocPositions(d, 1, 3)).toEqual({ from: 2, to: 4 });
        expect(mapTextOffsetsToDocPositions(d, 0, 3)).toEqual({ from: 1, to: 4 });
    });

    it("selects the exact text for the mapped range", () => {
        const d = doc(p(text("abc")));
        const mapped = mapTextOffsetsToDocPositions(d, 1, 3);
        expect(d.textBetween(mapped.from, mapped.to, "\n\n")).toBe("bc");
    });

    it("handles an insertion at the end of a paragraph (the reported bug)", () => {
        // original "abc", corrected "abcXYZ" -> hunk is the appended "XYZ"
        const d = doc(p(text("abcXYZ")));
        const serialized = getText(d);
        const strFrom = serialized.indexOf("XYZ");
        const strTo = strFrom + "XYZ".length;
        const mapped = mapTextOffsetsToDocPositions(d, strFrom, strTo);
        expect(d.textBetween(mapped.from, mapped.to, "\n\n")).toBe("XYZ");
        // deleting that range leaves the original
        expect(d.textBetween(1, mapped.from, "\n\n")).toBe("abc");
    });

    it("shifts offsets correctly across multiple paragraphs", () => {
        // getText -> "ab\n\ncde"
        const d = doc(p(text("ab")), p(text("cde")));
        const serialized = getText(d);
        expect(serialized).toBe("ab\n\ncde");

        const ab = mapTextOffsetsToDocPositions(d, 0, 2);
        expect(d.textBetween(ab.from, ab.to, "\n\n")).toBe("ab");

        const cde = mapTextOffsetsToDocPositions(d, 4, 7);
        expect(d.textBetween(cde.from, cde.to, "\n\n")).toBe("cde");
    });

    it("accounts for HardBreak rendered as a newline", () => {
        // getText -> "a\nb" (HardBreak becomes "\n")
        const d = doc(p(text("a"), br(), text("b")));
        const serialized = getText(d);
        expect(serialized).toBe("a\nb");

        // "b" sits at string offset 2
        const mapped = mapTextOffsetsToDocPositions(d, 2, 3);
        expect(d.textBetween(mapped.from, mapped.to, "\n\n")).toBe("b");
    });

    it("clamps to the end of the document", () => {
        const d = doc(p(text("abc")));
        const mapped = mapTextOffsetsToDocPositions(d, 3, 3);
        expect(mapped).toEqual({ from: 4, to: 4 });
    });

    it("handles an empty document without throwing", () => {
        const d = doc(p());
        const mapped = mapTextOffsetsToDocPositions(d, 0, 0);
        expect(mapped.from).toBe(1);
        expect(mapped.to).toBe(1);
    });
});
