import type { Editor } from "@tiptap/vue-3";

export const useStreamWriter = () => {
    return {
        applyStreamToEditor,
    };
};

async function applyStreamToEditor(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    editor: Editor,
): Promise<void> {
    editor.commands.setContent("");
    editor.setEditable(false);

    try {
        // Buffer to collect characters for complete words

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            const chunk = new TextDecoder().decode(value);

            editor
                .chain()
                .setMeta("addToHistory", false)
                .focus("end")
                .insertContent(chunk)
                .run();
        }
    } finally {
        editor.setEditable(true);
    }
}
