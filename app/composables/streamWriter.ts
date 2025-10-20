import type { Editor } from "@tiptap/vue-3";
import { parseMarkdown, stringifyMarkdown } from "@nuxtjs/mdc/runtime";

export const useStreamWriter = () => {
    return {
        applyStreamToEditor,
    };
};

async function applyStreamToEditor(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    editor: Editor,
    from: number,
    to: number,
): Promise<string> {
    const oldText = editor.getHTML();

    editor
        .chain()
        .setMeta("addToHistory", false)
        .deleteRange({ from, to })
        .run();

    // Buffer to collect characters for complete words
    let buffer = "";

    editor.chain().focus(from).run();

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        const chunk = new TextDecoder().decode(value);

        editor
            .chain()
            .setMeta("addToHistory", false)
            .insertContent(chunk)
            .run();

        // Update the cursor position
        buffer += chunk;
    }

    // const newBuffer = buffer.replace(/\n/g, "<br>");
    const ast = await parseMarkdown(buffer);
    const newBuffer = await stringifyMarkdown(ast.body, ast.data);

    console.log("Final buffer:", newBuffer);

    // revert changes and apply them again to create one history entry
    editor.chain().setMeta("addToHistory", false).setContent(oldText).run();
    editor
        .chain()
        .setTextSelection({ from, to })
        .insertContent(newBuffer, {
            applyInputRules: true,
            parseOptions: { preserveWhitespace: false },
        })
        .run();

    return buffer;
}
