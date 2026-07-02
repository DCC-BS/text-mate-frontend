import { describe, expect, it } from "vitest";
import { plainTextToEditorHtml } from "../../../app/utils/plainTextToEditorHtml";

describe("plainTextToEditorHtml", () => {
    it("maps the empty string to a single empty paragraph", () => {
        expect(plainTextToEditorHtml("")).toBe("<p></p>");
    });

    it("wraps a single line in one paragraph", () => {
        expect(plainTextToEditorHtml("hello")).toBe("<p>hello</p>");
    });

    it("treats a blank line as a paragraph boundary", () => {
        expect(plainTextToEditorHtml("a\n\nb")).toBe("<p>a</p><p>b</p>");
    });

    it("collapses runs of blank lines into a single paragraph break", () => {
        expect(plainTextToEditorHtml("a\n\n\n\nb")).toBe("<p>a</p><p>b</p>");
    });

    it("renders a single newline as a hard break, not a new paragraph", () => {
        expect(plainTextToEditorHtml("a\nb")).toBe("<p>a<br>b</p>");
    });

    it("preserves paragraph breaks and hard breaks together", () => {
        expect(plainTextToEditorHtml("p1\nsoft\n\np2")).toBe(
            "<p>p1<br>soft</p><p>p2</p>",
        );
    });

    it("escapes HTML so user text is never parsed as markup", () => {
        expect(plainTextToEditorHtml("<b>x</b>")).toBe("<p>&lt;b&gt;x&lt;/b&gt;</p>");
        expect(plainTextToEditorHtml("a & b")).toBe("<p>a &amp; b</p>");
    });

    it("round-trips a getText()-style serialization back to HTML", () => {
        // editor.getText() joins blocks with "\n\n" and hard breaks with "\n"
        const serialized = "first paragraph\n\nsecond\nline";
        expect(plainTextToEditorHtml(serialized)).toBe(
            "<p>first paragraph</p><p>second<br>line</p>",
        );
    });
});
