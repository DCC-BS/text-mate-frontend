import type { Node } from "@tiptap/pm/model";

/**
 * Block separator used by `editor.getText()`. Tiptap's default is `"\n\n"`,
 * which is what `getContent()` (and therefore the diff viewer's `text` prop)
 * serialises the document with.
 */
const BLOCK_SEPARATOR = "\n\n";

/**
 * Length of a block's inline content as it appears in `editor.getText()`.
 *
 * `node.textContent` does not render `HardBreak` nodes, so we walk the inline
 * children and count a hard break as a single `"\n"` character — matching the
 * schema's text serializer for the current `Document > Paragraph > Text` +
 * `HardBreak` structure.
 */
function inlineTextLength(block: Node): number {
    let length = 0;
    block.forEach((child) => {
        if (child.isText && child.text) {
            length += child.text.length;
        } else if (child.type.name === "hardBreak") {
            length += 1;
        }
    });
    return length;
}

/**
 * Maps character offsets within `editor.getText()` to ProseMirror document
 * positions.
 *
 * ProseMirror reserves a position for every node's opening token, so the text
 * of the first paragraph starts at position `1` (not `0`), and each subsequent
 * block is shifted further. Without this mapping, ranges derived from the
 * serialised text land one (or more) positions early and corrupt the document
 * on apply.
 *
 * @param doc     The current ProseMirror document.
 * @param strFrom Inclusive start offset within `editor.getText()`.
 * @param strTo   Exclusive end offset within `editor.getText()`.
 * @returns The equivalent `{ from, to }` ProseMirror positions.
 */
export function mapTextOffsetsToDocPositions(
    doc: Node,
    strFrom: number,
    strTo: number,
): { from: number; to: number } {
    const blocks: Array<{ strStart: number; pmStart: number; length: number }> =
        [];
    let strCursor = 0;

    doc.forEach((block, offset) => {
        const length = inlineTextLength(block);
        blocks.push({ strStart: strCursor, pmStart: offset + 1, length });
        strCursor += length + BLOCK_SEPARATOR.length;
    });

    const resolve = (target: number): number => {
        for (const block of blocks) {
            if (target <= block.strStart + block.length) {
                return block.pmStart + Math.max(0, target - block.strStart);
            }
        }
        const last = blocks[blocks.length - 1];
        return last ? last.pmStart + last.length : 1;
    };

    return { from: resolve(strFrom), to: resolve(strTo) };
}
