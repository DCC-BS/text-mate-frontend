import type { Editor } from "@tiptap/vue-3";

export const useStreamWriter = () => {
    return {
        applyStreamToEditor,
    };
};

async function applyStreamToEditor(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    editor: Editor,
) {
    editor.commands.setContent("");
    editor.setEditable(false);

    try {
        // Buffer to collect characters until a complete word is formed
        let buffer = "";
        // Flag to track if we're inside an HTML tag
        let insideTag = false;

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                // Insert any remaining text in the buffer
                if (buffer.length > 0) {
                    editor
                        .chain()
                        .focus("end")
                        .insertContent(`${buffer}`)
                        .run();
                }
                break;
            }

            const chunk = new TextDecoder().decode(value);
            buffer += chunk;

            // Process buffer to find complete words
            let lastBreakIndex = 0;

            // Look for word boundaries while respecting HTML tags
            for (let i = 0; i < buffer.length; i++) {
                // Track when we enter and exit HTML tags
                if (buffer[i] === "<") {
                    insideTag = true;
                } else if (buffer[i] === ">" && insideTag) {
                    insideTag = false;

                    // Keep processing to include complete tag in the current segment
                    continue;
                }

                // Skip processing word boundaries if we're inside a tag
                if (insideTag) {
                    continue;
                }

                // Check for word boundaries (whitespace, punctuation)
                if (/[\s,.!?;:()[\]{}'"]/g.test(buffer[i])) {
                    // If we have content to insert (from lastBreakIndex to current position)
                    if (i >= lastBreakIndex) {
                        // Extract the complete word/segment and insert it
                        const completeSegment = buffer.substring(
                            lastBreakIndex,
                            i + 1,
                        );

                        console.log("Inserting:", completeSegment);
                        editor
                            .chain()
                            .focus("end")
                            .insertContent(`${completeSegment}`)
                            .run();

                        lastBreakIndex = i + 1;
                    }
                }
            }

            // Remove processed content from buffer
            buffer = buffer.substring(lastBreakIndex);
        }
    } finally {
        editor.setEditable(true);
    }
}
