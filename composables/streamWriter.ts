import type { Editor } from "@tiptap/vue-3";

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

    editor.setEditable(false, false);

    editor
        .chain()
        .setMeta("addToHistory", false)
        .deleteRange({ from, to })
        .run();

    try {
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

        // Finalize the stream
        editor.chain().setMeta("addToHistory", false).setContent(oldText).run();

        editor
            .chain()
            .setTextSelection({ from, to })
            .insertContent(buffer)
            .run();

        return buffer;
    } finally {
        editor.setEditable(true);
    }
}
