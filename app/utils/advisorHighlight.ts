import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { Extension } from "@tiptap/vue-3";
import type { AdvisorThread } from "~/types/advisorV2";

export interface AdvisorHighlightPayload {
    threads: AdvisorThread[];
    focusedId: string | null;
}

export const advisorHighlightKey = new PluginKey<DecorationSet>(
    "advisorHighlight",
);

/** Meta key used to push new highlight state into the plugin. */
const HIGHLIGHT_META = "advisorHighlight";

interface OffsetEntry {
    offset: number;
    pos: number;
}

/**
 * Builds a map from plain-text character offsets to ProseMirror positions.
 *
 * The plain text is reconstructed with a single `\n` between top-level blocks
 * and for hard breaks, matching how the advisor editor loads text (one
 * paragraph per source line). Violation ranges are offsets into that text.
 */
function buildOffsetMap(doc: PMNode): {
    entries: OffsetEntry[];
    total: number;
} {
    const entries: OffsetEntry[] = [];
    let offset = 0;
    let sawBlock = false;

    doc.descendants((node, pos) => {
        if (node.isTextblock) {
            if (sawBlock) {
                offset += 1; // newline separating blocks
            }
            sawBlock = true;
            return true;
        }

        if (node.isText && node.text) {
            for (let i = 0; i < node.text.length; i++) {
                entries.push({ offset: offset + i, pos: pos + i });
            }
            offset += node.text.length;
            return false;
        }

        if (node.type.name === "hardBreak") {
            entries.push({ offset, pos });
            offset += 1;
        }

        return true;
    });

    return { entries, total: offset };
}

function posForOffset(
    map: { entries: OffsetEntry[]; total: number },
    offset: number,
): number | undefined {
    const first = map.entries[0];
    const last = map.entries[map.entries.length - 1];
    if (!first || !last) {
        return undefined;
    }

    if (offset <= first.offset) {
        return first.pos;
    }

    const entry = map.entries.find((e) => e.offset === offset);
    if (entry) {
        return entry.pos;
    }

    if (offset >= map.total) {
        return last.pos + 1;
    }

    return undefined;
}

function buildDecorations(
    doc: PMNode,
    payload: AdvisorHighlightPayload,
): DecorationSet {
    if (payload.threads.length === 0) {
        return DecorationSet.empty;
    }

    const map = buildOffsetMap(doc);
    const decorations: Decoration[] = [];

    for (const thread of payload.threads) {
        const from = posForOffset(map, thread.range.start);
        const to = posForOffset(map, thread.range.end);

        if (from === undefined || to === undefined || to <= from) {
            continue;
        }

        const overlaps = payload.threads.some(
            (other) =>
                other.id !== thread.id &&
                thread.range.start < other.range.end &&
                thread.range.end > other.range.start,
        );

        const classes = ["advisor-mark"];
        if (thread.status === "skip") {
            classes.push("advisor-mark--skip");
        }
        if (thread.id === payload.focusedId) {
            classes.push("advisor-mark--focused");
        }
        if (overlaps) {
            classes.push("advisor-mark--overlap");
        }

        decorations.push(
            Decoration.inline(from, to, {
                class: classes.join(" "),
                "data-mark": "1",
                "data-thread": thread.id,
            }),
        );
    }

    return DecorationSet.create(doc, decorations);
}

/**
 * ProseMirror extension that renders advisor threads as inline decorations.
 * Highlight state is pushed in via the {@link setAdvisorHighlights} command so
 * it stays in sync with the external thread store and focus state.
 */
export const AdvisorHighlightExtension = Extension.create({
    name: "advisorHighlight",

    addProseMirrorPlugins() {
        return [
            new Plugin<DecorationSet>({
                key: advisorHighlightKey,
                state: {
                    init: () => DecorationSet.empty,
                    apply(tr, old) {
                        const payload = tr.getMeta(HIGHLIGHT_META) as
                            | AdvisorHighlightPayload
                            | undefined;

                        if (payload) {
                            return buildDecorations(tr.doc, payload);
                        }

                        return old.map(tr.mapping, tr.doc);
                    },
                },
                props: {
                    decorations(state) {
                        return advisorHighlightKey.getState(state);
                    },
                },
            }),
        ];
    },
});

/**
 * Dispatches a transaction that replaces the current advisor highlights.
 * Returns nothing; safe to call on every thread/focus change.
 */
export function setAdvisorHighlights(
    view: EditorView | undefined,
    payload: AdvisorHighlightPayload,
): void {
    if (!view) {
        return;
    }

    const tr = view.state.tr.setMeta(HIGHLIGHT_META, payload);
    tr.setMeta("addToHistory", false);
    view.dispatch(tr);
}
