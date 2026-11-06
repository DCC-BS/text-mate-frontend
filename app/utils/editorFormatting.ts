import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";

/** One shared schema for the editor and integration tests, without duplicate history. */
export function editorFormattingExtensions() {
    return [
        StarterKit.configure({
            document: false,
            paragraph: false,
            text: false,
            hardBreak: false,
            undoRedo: false,
            heading: { levels: [1, 2, 3] },
            link: { openOnClick: false },
            blockquote: false,
            code: false,
            codeBlock: false,
            horizontalRule: false,
            trailingNode: false,
        }),
        TextStyle,
        FontFamily,
        FontSize,
    ];
}
