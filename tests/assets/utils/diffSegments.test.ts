import { describe, expect, it } from "vitest";
import { buildDiffHunks, buildDiffSegments } from "../../../app/utils/diffSegments";

// Convenience: extract just the change hunks for terser assertions.
function hunks(original: string, corrected: string) {
    return buildDiffHunks(original, corrected);
}

describe("buildDiffSegments", () => {
    it("returns no segments for two empty strings", () => {
        expect(buildDiffSegments("", "")).toEqual([]);
    });

    it("returns only text for identical inputs", () => {
        const segments = buildDiffSegments("Hello world", "Hello world");
        expect(segments).toHaveLength(1);
        expect(segments[0]).toEqual({ kind: "text", value: "Hello world" });
    });

    it("produces a single hunk for one word swap", () => {
        const result = hunks("Hello world", "Hello earth");

        expect(result).toHaveLength(1);
        const [hunk] = result;
        expect(hunk.removedText).toBe("world");
        expect(hunk.addedText).toBe("earth");
        expect(hunk.to - hunk.from).toBe(hunk.addedText.length);
    });

    it("groups adjacent word swaps separated by whitespace into one hunk", () => {
        const result = hunks("I hav went home", "I have gone home");

        expect(result).toHaveLength(1);
        const [hunk] = result;
        expect(hunk.removedText).toBe("hav went");
        expect(hunk.addedText).toBe("have gone");
        expect(hunk.to - hunk.from).toBe(hunk.addedText.length);
    });

    it("keeps distinct errors separated by real text as independent hunks", () => {
        const result = hunks(
            "This are a test of the sistem",
            "This is a test of the system",
        );

        expect(result).toHaveLength(2);
        expect(result[0].removedText).toBe("are");
        expect(result[0].addedText).toBe("is");
        expect(result[1].removedText).toBe("sistem");
        expect(result[1].addedText).toBe("system");
    });

    it("treats a pure insertion as a single hunk with empty removedText", () => {
        const result = hunks("Hello world", "Hello big world");

        expect(result).toHaveLength(1);
        expect(result[0].removedText).toBe("");
        expect(result[0].addedText).toBe("big ");
    });

    it("treats a pure deletion as a single hunk with empty addedText", () => {
        const result = hunks("Hello big world", "Hello world");

        expect(result).toHaveLength(1);
        expect(result[0].removedText).toBe("big ");
        expect(result[0].addedText).toBe("");
    });

    describe("offset consistency (rewrite revert path)", () => {
        it("every hunk spans exactly its addedText in the corrected text", () => {
            const original = "I hav went home and the sistem is bad";
            const corrected = "I have gone home and the system is good";
            const text = corrected;

            for (const hunk of hunks(original, corrected)) {
                expect(text.slice(hunk.from, hunk.to)).toBe(hunk.addedText);
            }
        });

        it("reconstructs the corrected text when every hunk is accepted", () => {
            const original = "I hav went home and the sistem is bad";
            const corrected = "I have gone home and the system is good";

            let resolved = "";
            for (const segment of buildDiffSegments(original, corrected)) {
                if (segment.kind === "text") {
                    resolved += segment.value;
                } else {
                    resolved += segment.hunk.addedText;
                }
            }
            expect(resolved).toBe(corrected);
        });

        it("reconstructs the original text when every hunk is rejected", () => {
            const original = "I hav went home and the sistem is bad";
            const corrected = "I have gone home and the system is good";

            let resolved = "";
            for (const segment of buildDiffSegments(original, corrected)) {
                if (segment.kind === "text") {
                    resolved += segment.value;
                } else {
                    resolved += segment.hunk.removedText;
                }
            }
            expect(resolved).toBe(original);
        });
    });
});
