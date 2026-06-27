import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/vue-3";
import type { AdvisorThread } from "~/assets/models/advisor";
import { buildDecorationSpecs, type DecorationSpec } from "~/utils/advisorText";

export const advisorDecorationKey: PluginKey<DecorationSet> =
    new PluginKey<DecorationSet>("advisorDecorations");

export type AdvisorDecorationOptions = {
    getThreads: () => AdvisorThread[];
    getActiveId: () => string | null;
    onSelect: (threadId: string) => void;
};

/**
 * Inline ProseMirror decoration plugin that renders every thread range as a
 * highlight span. Uses decorations (not Marks) so `getText()` stays free of
 * markup and backend offsets remain authoritative. Decorations rebuild on
 * the `advisorDecorationKey` meta (thread/focus change) or any doc change.
 */
export function createAdvisorDecorationExtension(
    options: AdvisorDecorationOptions,
) {
    return Extension.create({
        name: "advisorDecorations",

        addProseMirrorPlugins() {
            return [
                new Plugin<DecorationSet>({
                    key: advisorDecorationKey,
                    state: {
                        init: (_config, state) => build(state),
                        apply: (tr, prev, _oldState, newState) => {
                            if (
                                tr.getMeta(advisorDecorationKey) ||
                                tr.docChanged
                            ) {
                                return build(newState);
                            }
                            return prev;
                        },
                    },
                    props: {
                        decorations: (state) =>
                            advisorDecorationKey.getState(state),
                        handleClick: (view, pos) => {
                            const set = advisorDecorationKey.getState(
                                view.state,
                            );
                            if (!set) {
                                return false;
                            }
                            const hit = set
                                .find(pos, pos)
                                .find(
                                    (d) => typeof d.spec?.threadId === "string",
                                );
                            if (hit) {
                                options.onSelect(hit.spec.threadId as string);
                                return true;
                            }
                            return false;
                        },
                    },
                }),
            ];
        },
    });

    function build(state: {
        doc: Parameters<typeof buildDecorationSpecs>[0];
    }): DecorationSet {
        const specs = buildDecorationSpecs(
            state.doc,
            options.getThreads(),
            options.getActiveId(),
        );
        const decos = specs.map((spec) =>
            Decoration.inline(
                spec.from,
                spec.to,
                {
                    class: decorationClass(spec),
                    "data-thread-id": spec.id,
                },
                { threadId: spec.id },
            ),
        );
        return DecorationSet.create(state.doc, decos);
    }
}

function decorationClass(spec: DecorationSpec): string {
    const classes = ["advisor-mark"];
    if (spec.type === "user") {
        classes.push("advisor-mark--user");
    } else if (spec.status === "skip") {
        classes.push("advisor-mark--skip");
    }
    if (spec.active) {
        classes.push("advisor-mark--active");
    }
    return classes.join(" ");
}
