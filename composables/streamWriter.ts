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
): Promise<void> {
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

        console.log("Buffer:", buffer);

        // Finalize the stream
        const end = editor.state.selection.to;

        editor.chain().setMeta("addToHistory", false).setContent(oldText).run();

        console.log("replace form to:", from, to);

        editor
            .chain()
            .setTextSelection({ from, to })
            .insertContent(buffer)
            .run();

        // editor
        //     .chain()
        //     .setMeta("addToHistory", true)
        //     .deleteRange({ from, to: buffer.length + 1 })
        //     .focus(from)
        //     .insertContent(buffer)
        //     .run();
    } finally {
        editor.setEditable(true);
    }
}
