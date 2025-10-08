import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import CharacterCount from "@tiptap/extension-character-count";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import History from "@tiptap/extension-history";
import Italic from "@tiptap/extension-italic";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import { useEditor } from "@tiptap/vue-3";
import {
    type ApplyTextCommand,
    Cmds,
    type RedoCommand,
    type ToggleEditableEditorCommand,
    type ToggleLockEditorCommand,
    type ToolSwitchCommand,
    type UndoCommand,
    UndoRedoStateChanged,
} from "~/assets/models/commands";
import { FocusedSentenceMark } from "~/utils/focused-sentence-mark";
import { FocusedWordMark } from "~/utils/focused-word-mark";

export interface UseTextEditorOptions {
    container: Ref<HTMLElement | undefined>;
    modelValue: Ref<string>;
    limit: Ref<number>;
    lockEditor: Ref<boolean>;
}

export function useTextEditor(options: UseTextEditorOptions) {
    const { modelValue, limit, lockEditor } = options;

    const undoRedoState = ref({
        canUndo: false,
        canRedo: false,
    });

    const isTextCorrectionActive = ref(true);
    const isRewriteActive = ref(false);

    const { onCommand, executeCommand } = useCommandBus();
    const toast = useToast();

    const { FocusExtension, focusedSentence, focusedWord, focusedSelection } =
        useTextFocus(isRewriteActive);
    const { CorrectionExtension, hoverBlock, relativeHoverRect } =
        useTextCorrectionMarks(options.container, isTextCorrectionActive);

    const editor = useEditor({
        content: modelValue.value,
        extensions: [
            Text,
            Document,
            BulletList,
            ListItem,
            OrderedList,
            Paragraph,
            HardBreak,
            Bold,
            Italic,
            Strike,
            History,
            Heading,
            FocusExtension,
            CorrectionExtension,
            CharacterCount.configure({
                limit: limit.value,
            }),
            FocusedSentenceMark,
            FocusedWordMark,
        ],
        enablePasteRules: false,
        enableInputRules: false,
        editorProps: {
            handleKeyDown: (_, event) => {
                // Check if Ctrl+C is pressed
                if (event.ctrlKey && event.key === "c") {
                    // Check if there is no text selection
                    if (editor.value?.state.selection.empty) {
                        // Select all text
                        editor.value?.commands.selectAll();
                        toast.add({
                            title: "Ctrl+C pressed",
                            description: "Select all text",
                            color: "info",
                            icon: "i-lucide-clipboard-list",
                        });
                    }
                }
            },
        },
        onUpdate: ({ editor }) => {
            if (!editor.isEditable) return;

            modelValue.value = getContent();

            const canUndo = editor.can().undo();
            const canRedo = editor.can().redo();

            if (
                undoRedoState.value.canUndo !== canUndo ||
                undoRedoState.value.canRedo !== canRedo
            ) {
                undoRedoState.value = { canUndo, canRedo };
                executeCommand(new UndoRedoStateChanged(canUndo, canRedo));
            }
        },
    });

    // Command handlers
    onCommand<ApplyTextCommand>(Cmds.ApplyTextCommand, async (command) => {
        if (!editor.value) return;
        const text = command.text;
        const range = command.range;

        editor.value
            .chain()
            .setTextSelection(range)
            .insertContent(text)
            .focus(range.from)
            .run();
    });

    onCommand<UndoCommand>(Cmds.UndoCommand, async () => {
        if (!editor.value || !editor.value.can().undo()) return;

        editor.value.commands.undo();
    });

    onCommand<RedoCommand>(Cmds.RedoCommand, async () => {
        if (!editor.value || !editor.value.can().redo()) return;

        editor.value.commands.redo();
    });

    onCommand<ToggleEditableEditorCommand>(
        Cmds.ToggleEditableEditorCommand,
        async (command) => {
            if (!editor.value) return;

            editor.value.setEditable(!command.locked, !command.locked);
            editor.value.isFocused = !command.locked;
        },
    );

    onCommand<ToggleLockEditorCommand>(
        Cmds.ToggleLockEditorCommand,
        async (command) => {
            lockEditor.value = command.locked;
            if (!editor.value) return;
        },
    );

    onCommand<ToolSwitchCommand>(Cmds.ToolSwitchCommand, async (command) => {
        isTextCorrectionActive.value = command.tool === "correction";
        isRewriteActive.value = command.tool === "rewrite";
    });

    // Watchers
    watch(modelValue, (value) => {
        if (!editor.value) return;

        if (getContent() === value) {
            return;
        }
        editor.value.commands.setContent(value);
    });

    onUnmounted(() => {
        editor.value?.destroy();
    });

    // Editor utility functions
    function getContent(): string {
        if (!editor.value) {
            return "";
        }

        return editor.value.getText();
    }

    /**
     * Gets the current cursor position and selection information
     */
    function getCursorInfo() {
        if (!editor.value) return null;

        const { from, to } = editor.value.state.selection;
        const selectedText = editor.value.state.doc.textBetween(from, to);

        return {
            from,
            to,
            selectedText,
            currentLine: 1, // Simplified for now
            column: from + 1,
            isEmpty: from === to,
        };
    }

    /**
     * Inserts text at the current cursor position
     */
    function insertText(text: string): void {
        if (!editor.value) return;

        editor.value.chain().focus().insertContent(text).run();
    }

    /**
     * Replaces the current selection with new text
     */
    function replaceSelection(text: string): void {
        if (!editor.value) return;

        const cursorInfo = getCursorInfo();
        if (!cursorInfo) return;

        editor.value
            .chain()
            .focus()
            .setTextSelection({ from: cursorInfo.from, to: cursorInfo.to })
            .insertContent(text)
            .run();
    }

    /**
     * Gets the word at the current cursor position
     */
    function getCurrentWord(): string {
        if (!editor.value) return "";

        const cursorInfo = getCursorInfo();
        if (!cursorInfo) return "";

        const text = editor.value.getText();
        const beforeCursor = text.substring(0, cursorInfo.from);
        const afterCursor = text.substring(cursorInfo.from);

        // Match word boundaries
        const wordBefore = beforeCursor.match(/\w+$/)?.[0] || "";
        const wordAfter = afterCursor.match(/^\w+/)?.[0] || "";

        return wordBefore + wordAfter;
    }

    /**
     * Autoformats the current paragraph
     */
    function autoformatParagraph(): void {
        if (!editor.value) return;

        const cursorInfo = getCursorInfo();
        if (!cursorInfo) return;

        // Get the full text and apply formatting rules
        const fullText = editor.value.getText();
        const sentences = fullText.split(/([.!?]+)/);

        let formattedText = "";
        for (let i = 0; i < sentences.length; i++) {
            let sentence = sentences[i] || "";

            // Capitalize standalone 'i'
            sentence = sentence.replace(/\b(i)\b/g, "I");

            // Capitalize first letter after punctuation
            if (i > 0 && /[.!?]/.test(sentences[i - 1] || "")) {
                sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
            }

            // Remove extra spaces
            sentence = sentence.replace(/\s{2,}/g, " ");

            formattedText += sentence;
        }

        editor.value.commands.setContent(formattedText);
    }

    return {
        editor,
        undoRedoState,
        focusedSentence,
        focusedWord,
        focusedSelection,
        hoverBlock,
        relativeHoverRect,
        isRewriteActive,
        isTextCorrectionActive,
        getContent,
        getCursorInfo,
        insertText,
        replaceSelection,
        getCurrentWord,
        autoformatParagraph,
    };
}
