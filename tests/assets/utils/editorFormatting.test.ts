import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import { editorFormattingExtensions } from "../../../app/utils/editorFormatting";
import { advisorSegments, offsetToPos, serializeAdvisorText } from "../../../app/utils/advisorText";
import { mapTextOffsetsToDocPositions } from "../../../app/utils/mapTextOffsets";

// Use the production formatting extensions so schema and serializer regressions surface.
describe("formatted editor integration", function () {
    it("maps nested list corrections and preserves surrounding marks through undo/redo", function () {
        const editor = new Editor({ extensions: [Document, Paragraph, Text, HardBreak, History, ...editorFormattingExtensions()], content: '<h1>Titel</h1><ol><li><p><strong>Erstens</strong></p><ul><li><p>Ziel<br>Zeile</p></li></ul></li><li><p>Ende</p></li></ol>' });
        try {
            const text = serializeAdvisorText(editor.state.doc);
            expect(text).toBe("Titel\n\nErstens\n\nZiel\nZeile\n\nEnde");
            const start = text.indexOf("Ziel");
            const range = mapTextOffsetsToDocPositions(editor.state.doc, start, start + 4);
            expect(editor.state.doc.textBetween(range.from, range.to)).toBe("Ziel");
            expect(offsetToPos(advisorSegments(editor.state.doc), start)?.pos).toBe(range.from);
            editor.chain().setTextSelection(range).insertContent("Neu").run();
            expect(serializeAdvisorText(editor.state.doc)).toContain("Neu\nZeile");
            expect(editor.getHTML()).toContain("<strong>Erstens</strong>");
            editor.commands.undo();
            expect(serializeAdvisorText(editor.state.doc)).toBe(text);
            editor.commands.redo();
            expect(serializeAdvisorText(editor.state.doc)).toContain("Neu\nZeile");
        } finally { editor.destroy(); }
    });
});
