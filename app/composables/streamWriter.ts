import type { Editor } from "@tiptap/vue-3";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import UndoRedo from "@tiptap/extension-history";

export const useStreamWriter = () => {
    return {
        applyStreamToEditor,
    };
};

async function applyStreamToEditor(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    editor: Editor,
): Promise<string> {
    // editor
    //     .chain()
    //     .setMeta("addToHistory", false)
    //     .selectAll()
    //     .insertContent("")
    //     .run();

    const oldText = editor.getText();

    // Buffer to collect characters for complete words
    let buffer = "";

    editor.chain().selectAll().run();

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

    console.log("Raw buffer:", buffer);

    const newBuffer = await unified()
        .use(remarkParse) // Parse markdown to mdast
        .use(remarkRehype) // Convert mdast to hast (HTML AST)
        .use(rehypeStringify) // Serialize hast to HTML string
        .process(buffer)
        .then((file) => String(file));

    console.log("Final buffer:", newBuffer);

    editor
        .chain()
        .setMeta("addToHistory", false)
        .selectAll()
        .insertContent(oldText)
        .run();

    // revert changes and apply them again to create one history entry
    editor
        .chain()
        .selectAll()
        .insertContent(newBuffer, {
            applyInputRules: true,
            parseOptions: { preserveWhitespace: false },
        })
        .run();

    return buffer;
}
