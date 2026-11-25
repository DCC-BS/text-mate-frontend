import type { JSONContent } from "@tiptap/core";
import JSZip from "jszip";
import { tiptapToDocx } from "../../../app/utils/tiptapToDocx.client";
import { DEFAULT_WORD_EXPORT_SETTINGS } from "../../../app/utils/wordExportSettings";

/** Read the actual package, not mocked DOCX constructors. */
async function exportXml(content: JSONContent[]): Promise<JSZip> {
    const blob = await tiptapToDocx({ type: "doc", content }, DEFAULT_WORD_EXPORT_SETTINGS);
    return await JSZip.loadAsync(await blob.arrayBuffer());
}
function paragraph(text: string): JSONContent {
    return { type: "paragraph", content: [{ type: "text", text }] };
}

describe("structured Word export", function () {
    it("writes styles, language, A4 margins, and explicit mark overrides", async function () {
        const zip = await exportXml([
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Schweizer Grüsse", marks: [{ type: "bold" }, { type: "textStyle", attrs: { fontFamily: "Times New Roman", fontSize: "14pt" } }] }] },
            { type: "paragraph", content: [{ type: "text", text: "formatiert", marks: [{ type: "bold" }, { type: "italic" }, { type: "underline" }, { type: "strike" }, { type: "focusedWord" }] }, { type: "hardBreak" }, { type: "text", text: "danach" }] },
            { type: "paragraph" },
        ]);
        const document = await zip.file("word/document.xml")!.async("string");
        const styles = await zip.file("word/styles.xml")!.async("string");
        expect(styles).toContain('w:ascii="Arial"');
        expect(styles).toContain('w:sz w:val="24"');
        expect(styles).toContain('w:lang w:val="de-CH"');
        expect(styles).toContain('w:line="276"');
        expect(styles).toContain('w:after="200"');
        expect(document).toContain('w:pStyle w:val="Heading1"');
        expect(document).toContain('w:ascii="Times New Roman"');
        expect(document).toContain('w:sz w:val="28"');
        for (const tag of ["<w:b/>", "<w:i/>", "<w:strike/>", "<w:u", "<w:br/>"]) expect(document).toContain(tag);
        expect(document).toContain("Schweizer Grüsse");
        expect(document).toContain('w:left="1440"');
        expect(document).toContain('w:w="11906"');
        expect(document.match(/<w:p>/g)).toHaveLength(3);
        expect(document).not.toContain("focusedWord");
    });

    it("writes real list numbering, nested levels, restarts, and safe link relationships", async function () {
        const zip = await exportXml([
            { type: "orderedList", attrs: { start: 4 }, content: [{ type: "listItem", content: [paragraph("Erstens"), { type: "bulletList", content: [{ type: "listItem", content: [paragraph("Unterpunkt")] }] }, paragraph("Fortsetzung")] }, { type: "listItem", content: [paragraph("Zweitens")] }] },
            { type: "orderedList", content: [{ type: "listItem", content: [paragraph("Neustart")] }] },
            { type: "paragraph", content: [{ type: "text", text: "Link", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }, { type: "text", text: "Unsicher", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] },
        ]);
        const document = await zip.file("word/document.xml")!.async("string");
        const numbering = await zip.file("word/numbering.xml")!.async("string");
        const relationships = await zip.file("word/_rels/document.xml.rels")!.async("string");
        expect(numbering).toContain('w:start w:val="4"');
        expect(numbering).toContain('w:numFmt w:val="bullet"');
        expect(document).toContain('w:ilvl w:val="1"');
        expect(document.match(/<w:numPr>/g)).toHaveLength(4);
        expect(document).toContain("Fortsetzung");
        expect(document).toContain("<w:hyperlink");
        expect(relationships).toContain("https://example.com/");
        expect(relationships).not.toContain("javascript:");
    });

    it("rejects unsupported content rather than silently losing it", async function () {
        await expect(exportXml([{ type: "table" }])).rejects.toThrow("Unsupported document node");
    });

    it("applies custom defaults and margin profiles", async function () {
        const blob = await tiptapToDocx({ type: "doc", content: [paragraph("Test")] }, { ...DEFAULT_WORD_EXPORT_SETTINGS, fontFamily: "Aptos", fontSize: 11, language: "en-GB", lineSpacing: 1.5, marginPreset: "wide" });
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const styles = await zip.file("word/styles.xml")!.async("string");
        expect(styles).toContain('w:ascii="Aptos"');
        expect(styles).toContain('w:sz w:val="22"');
        expect(styles).toContain('w:val="en-GB"');
        expect(styles).toContain('w:line="360"');
        expect(await zip.file("word/document.xml")!.async("string")).toContain('w:left="2880"');
    });
});
