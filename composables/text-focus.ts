import { getMarkType } from "@tiptap/vue-3";
import type { Node } from "@tiptap/pm/model";
import { type Editor, Extension } from "@tiptap/core";

export type TextFocus = {
    text: string;
    start: number;
    end: number;
};

export function useTextFocus(isActive: Ref<boolean>) {
    const focusedWord = ref<TextFocus>();
    const focusedSentence = ref<TextFocus>();
    const focusedSelection = ref<TextFocus>();

    watch(isActive, (newValue) => {
        if (!newValue) {
            focusedWord.value = undefined;
            focusedSentence.value = undefined;
            focusedSelection.value = undefined;
        }
    });

    /**
     * Updates editor marks and focus state based on current selection
     */
    function handleSelectionUpdate(editor: Editor) {
        if (!isActive.value) {
            clearFocusMarks(editor);
            return;
        }

        const { from, to } = editor.state.selection;
        const doc = editor.state.doc;

        // Clear existing marks first
        clearFocusMarks(editor);

        // Determine text boundaries
        const isClickOnly = from === to;
        const wordBounds = getWordBoundaries(doc, from, to);
        const sentenceBounds = getSentenceBoundaries(doc, from, to);

        // If clicking on whitespace, just clear everything
        if (isClickOnly && wordBounds.start === wordBounds.end) {
            focusedWord.value = undefined;
            focusedSentence.value = undefined;
            focusedSelection.value = undefined;
            return;
        }

        // Handle selection focus when more than one word is selected
        if (!isClickOnly) {
            const selectionText = doc.textBetween(from, to);
            // Set focusedSelection if there's an actual selection with text
            if (selectionText.length > 0 && from !== to) {
                focusedSelection.value = {
                    text: selectionText,
                    start: from,
                    end: to,
                };
            } else {
                focusedSelection.value = undefined;
            }

            focusedWord.value = undefined;
            focusedSentence.value = undefined;
            return;
        }

        focusedSelection.value = undefined;

        // Extract text content
        const wordText = doc.textBetween(wordBounds.start, wordBounds.end);
        const sentenceText = doc.textBetween(
            sentenceBounds.start,
            sentenceBounds.end,
        );

        // Apply new marks if we have text
        if (sentenceText.length > 0) {
            applyMark(
                editor,
                "focusedSentence",
                sentenceBounds.start,
                sentenceBounds.end,
            );
        }

        if (wordText.length > 0) {
            applyMark(editor, "focusedWord", wordBounds.start, wordBounds.end);

            // Update reactive references
            focusedWord.value = {
                text: wordText,
                start: wordBounds.start,
                end: wordBounds.end,
            };
        } else {
            focusedWord.value = undefined;
        }

        focusedSentence.value = {
            text: sentenceText,
            start: sentenceBounds.start,
            end: sentenceBounds.end,
        };
    }

    const FocusExtension = Extension.create({
        name: "focusExtension",

        onSelectionUpdate(this) {
            handleSelectionUpdate(this.editor);
        },
    });

    return {
        FocusExtension,
        focusedWord,
        focusedSentence,
        focusedSelection,
    };
}

/**
 * Clears all focus marks from the editor
 */
function clearFocusMarks(editor: Editor) {
    const schema = editor.state.schema;
    const docSize = editor.state.doc.content.size;

    // Remove existing marks in one transaction
    editor.view.dispatch(
        editor.state.tr
            .setMeta("addToHistory", false)
            .removeMark(0, docSize, getMarkType("focusedSentence", schema))
            .removeMark(0, docSize, getMarkType("focusedWord", schema)),
    );
}

/**
 * Applies a mark to the specified range
 */
function applyMark(editor: Editor, markName: string, from: number, to: number) {
    const markType = getMarkType(markName, editor.state.schema);
    editor.view.dispatch(
        editor.state.tr
            .setMeta("addToHistory", false)
            .addMark(from, to, markType.create()),
    );
}

/**
 * Gets word boundaries based on selection state
 */
function getWordBoundaries(doc: Node, from: number, to: number) {
    return {
        start: findStartOfWord(doc, from),
        end: findEndOfWord(doc, to),
    };
}

/**
 * Gets sentence boundaries based on selection state
 */
function getSentenceBoundaries(doc: Node, from: number, to: number) {
    return {
        start: findStartOfSentence(doc, from),
        end: findEndOfSentence(doc, to),
    };
}

/**
 * Finds the start position of a word in the document
 */
function findStartOfWord(doc: Node, pos: number) {
    let current = pos;

    while (current > 0 && /\S/.test(doc.textBetween(current - 1, current))) {
        current--;
    }
    return current;
}

/**
 * Finds the end position of a word in the document
 */
function findEndOfWord(doc: Node, pos: number) {
    let current = pos;

    while (
        current < doc.content.size &&
        /\S/.test(doc.textBetween(current, current + 1))
    ) {
        current++;
    }
    return current;
}

/**
 * Finds the start position of a sentence in the document
 */
function findStartOfSentence(doc: Node, pos: number) {
    let current = pos;

    while (
        current > 0 &&
        !".!?\n".includes(doc.textBetween(current - 1, current))
    ) {
        current--;
    }

    // Adjust to not include whitespaces at the start of the sentence
    while (
        current < doc.content.size &&
        /\s/.test(doc.textBetween(current, current + 1))
    ) {
        current++;
    }

    return current;
}

/**
 * Finds the end position of a sentence in the document
 */
function findEndOfSentence(doc: Node, pos: number) {
    let current = pos;
    while (
        current < doc.content.size &&
        !".!?\n".includes(doc.textBetween(current, current + 1))
    ) {
        current++;
    }

    // Adjust to include the end of the sentence
    if (current < doc.content.size) {
        current++;
    }

    return current;
}
