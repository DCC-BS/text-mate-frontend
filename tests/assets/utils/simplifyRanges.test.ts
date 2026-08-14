import { describe, expect, it } from "vitest";
import { Node as PmNode, Schema } from "prosemirror-model";
import { Transform } from "prosemirror-transform";
import { reflowAdvisorRanges } from "../../../app/utils/advisorText";
import type { DiffHunk } from "../../../app/types/diff";
import {
    buildSimplifyDecorationSpecs,
    remapUnconvergedRanges,
    type SimplifyRange,
} from "../../../app/utils/simplifyRanges";

// Same minimal schema as advisorText.test.ts.
const schema = new Schema({
    nodes: {
        doc: { content: "block+" },
        paragraph: {
            group: "block",
            content: "inline*",
            toDOM: () => ["p", 0],
        },
        text: { group: "inline" },
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

function rangeAt(id: string, start: number, end: number): SimplifyRange {
    return { id, range: { start, end }, kind: "rewritten" };
}

describe("buildSimplifyDecorationSpecs", () => {
    it("builds a decoration covering a whole paragraph addressed by its exact offsets", () => {
        // "Intro" (0..5), "\n\n" (5..7), "Hard paragraph" (7..22).
        const d = doc(p(text("Intro")), p(text("Hard paragraph")));
        const ranges = [rangeAt("r1", 7, 22)];

        const specs = buildSimplifyDecorationSpecs(d, ranges, null);

        expect(specs).toHaveLength(1);
        expect(specs[0]?.id).toBe("r1");
        expect(specs[0]?.active).toBe(false);
    });

    it("marks the matching range active", () => {
        const d = doc(p(text("Intro")), p(text("Hard paragraph")));
        const ranges = [rangeAt("r1", 7, 22)];

        const specs = buildSimplifyDecorationSpecs(d, ranges, "r1");

        expect(specs[0]?.active).toBe(true);
    });

    it("splits a range spanning multiple paragraphs into one piece per paragraph", () => {
        // "A" (0..1), "\n\n" (1..3), "B" (3..4), "\n\n" (4..6), "C" (6..7).
        const d = doc(p(text("A")), p(text("B")), p(text("C")));
        const ranges = [rangeAt("r1", 0, 7)];

        const specs = buildSimplifyDecorationSpecs(d, ranges, null);

        expect(specs).toHaveLength(3);
        expect(specs.every((s) => s.id === "r1")).toBe(true);
    });

    it("drops a range with no valid segments (empty doc)", () => {
        const d = doc(p());
        const ranges = [rangeAt("r1", 0, 5)];

        const specs = buildSimplifyDecorationSpecs(d, ranges, null);

        expect(specs).toHaveLength(0);
    });
});

describe("SimplifyRange reflow (shared engine with AdvisorThread)", () => {
    it("reflows a simplify range through an edit before it, via the same reflowAdvisorRanges used for advisor threads", () => {
        const oldDoc = doc(p(text("Hello world")));
        const tr = new Transform(oldDoc).insert(1, schema.text("XX"));
        const r = rangeAt("r1", 6, 11);

        reflowAdvisorRanges(oldDoc, tr.doc, tr.mapping, [r]);

        const newText = tr.doc.textBetween(0, tr.doc.content.size, "\n\n");
        expect(newText.slice(r.range.start, r.range.end)).toBe("world");
    });

    it("auto-dismisses (start = -1) when the range's text is deleted", () => {
        const oldDoc = doc(p(text("Hello world")));
        const tr = new Transform(oldDoc).delete(7, 12);
        const r = rangeAt("r1", 6, 11);

        reflowAdvisorRanges(oldDoc, tr.doc, tr.mapping, [r]);

        expect(r.range.start).toBe(-1);
        expect(r.range.end).toBe(-1);
    });
});

function hunk(
    from: number,
    removedText: string,
    addedText: string,
    status: DiffHunk["status"],
): DiffHunk {
    return {
        key: `${removedText}::${addedText}`,
        from,
        to: from + addedText.length,
        removedText,
        addedText,
        status,
    };
}

describe("remapUnconvergedRanges", () => {
    it("leaves a range untouched when no hunk overlaps or precedes it", () => {
        const mapped = remapUnconvergedRanges([{ start: 10, end: 20 }], []);

        expect(mapped).toEqual([{ start: 10, end: 20, kind: "rewritten" }]);
    });

    it("passes an accepted/pending hunk through unchanged (addedText already matches the corrected text)", () => {
        // "Intro " (0..6) + "hard word" (6..15, accepted) + " tail" (15..20)
        const hunks = [hunk(6, "easy word", "hard word", "accepted")];

        const mapped = remapUnconvergedRanges([{ start: 6, end: 15 }], hunks);

        expect(mapped).toEqual([{ start: 6, end: 15, kind: "rewritten" }]);
    });

    it("remaps a range onto the restored original text when its hunk is rejected", () => {
        // Corrected text: "Intro " (0..6) + "hard word" (6..15, rejected) + " tail".
        // Rejecting restores "an easy original phrase" (24 chars) in its place.
        const hunks = [
            hunk(6, "an easy original phrase", "hard word", "rejected"),
        ];

        const mapped = remapUnconvergedRanges([{ start: 6, end: 15 }], hunks);

        expect(mapped).toEqual([
            { start: 6, end: 6 + "an easy original phrase".length, kind: "rejected" },
        ]);
    });

    it("shifts a range that lies entirely after an earlier rejected hunk", () => {
        // Rejected hunk before the range: removedText is 5 chars longer than
        // addedText, so everything after it shifts by +5.
        const hunks = [hunk(0, "original phrase", "short", "rejected")];

        const mapped = remapUnconvergedRanges([{ start: 10, end: 20 }], hunks);

        const delta = "original phrase".length - "short".length;
        expect(mapped).toEqual([
            { start: 10 + delta, end: 20 + delta, kind: "rewritten" },
        ]);
    });

    it("tags a range as rewritten (not rejected) when it only overlaps an accepted hunk", () => {
        const hunks = [hunk(6, "easy word", "hard word", "accepted")];

        const mapped = remapUnconvergedRanges([{ start: 0, end: 15 }], hunks);

        expect(mapped[0]?.kind).toBe("rewritten");
    });

    it("drops a range that collapses to empty after remapping", () => {
        // A rejected hunk whose removedText is empty (pure insertion,
        // rejected) collapses any range pinned exactly to it.
        const hunks = [hunk(6, "", "inserted", "rejected")];

        const mapped = remapUnconvergedRanges([{ start: 6, end: 14 }], hunks);

        expect(mapped).toEqual([]);
    });
});
