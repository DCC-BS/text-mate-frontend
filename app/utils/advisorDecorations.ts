import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/vue-3";
import type { AdvisorPhase, AdvisorThread } from "~/assets/models/advisor";
import { buildDecorationSpecs, type DecorationSpec } from "~/utils/advisorText";

export const advisorDecorationKey: PluginKey<DecorationSet> =
    new PluginKey<DecorationSet>("advisorDecorations");

// Phases in which inline thread decorations are rendered. Outside these the
// editor shows plain text (e.g. during `edit` or after `review`).
const DECORATED_PHASES: ReadonlySet<AdvisorPhase> = new Set([
    "reviewing",
    "review",
]);

export type AdvisorDecorationOptions = {
    getThreads: () => AdvisorThread[];
    getActiveId: () => string | null;
    getPhase: () => AdvisorPhase;
    onSelect: (threadId: string) => void;
};

/**
 * Inline ProseMirror decoration plugin that renders every thread range as a
 * highlight span. Uses decorations (not Marks) so `getText()` stays free of
 * markup and backend offsets remain authoritative. Decorations rebuild on
 * the `advisorDecorationKey` meta (thread/focus/phase change) or any doc
 * change, but are only emitted while the phase is `reviewing` or `review`.
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
                            const candidateIds = new Set<string>();
                            for (const d of set.find(pos, pos)) {
                                if (typeof d.spec?.threadId === "string") {
                                    candidateIds.add(d.spec.threadId as string);
                                }
                            }
                            if (candidateIds.size === 0) {
                                return false;
                            }
                            // When ranges overlap, prefer the smallest-range
                            // thread so the inner (smaller) mark is reachable on
                            // click instead of being shadowed by the larger one.
                            const threads = options.getThreads();
                            let best: AdvisorThread | null = null;
                            for (const id of candidateIds) {
                                const thread = threads.find((t) => t.id === id);
                                if (!thread) {
                                    continue;
                                }
                                const size =
                                    thread.range.end - thread.range.start;
                                if (
                                    best === null ||
                                    size < best.range.end - best.range.start
                                ) {
                                    best = thread;
                                }
                            }
                            if (best) {
                                options.onSelect(best.id);
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
        // Decorations are only visible in the reviewing/review phases.
        if (!DECORATED_PHASES.has(options.getPhase())) {
            return DecorationSet.empty;
        }
        const specs = buildDecorationSpecs(
            state.doc,
            options.getThreads(),
            options.getActiveId(),
        );
        const decos = specs.map((spec) => {
            if (spec.overlapMarker) {
                // Overlap markers carry no thread id → click handling skips
                // them; they only inject the overlap class on the segment.
                return Decoration.inline(
                    spec.from,
                    spec.to,
                    {
                        class: decorationClass(spec),
                    },
                    {},
                );
            }
            return Decoration.inline(
                spec.from,
                spec.to,
                {
                    class: decorationClass(spec),
                    "data-thread-id": spec.id,
                },
                { threadId: spec.id },
            );
        });
        return DecorationSet.create(state.doc, decos);
    }
}

function decorationClass(spec: DecorationSpec): string {
    if (spec.overlapMarker) {
        if (spec.overlapMixed) {
            const classes = [
                "advisor-mark--overlap",
                "advisor-mark--overlap-mixed",
            ];
            if (spec.overlapActiveType === "user") {
                classes.push("advisor-mark--overlap-mixed-user");
            } else if (spec.overlapActiveType === "violation") {
                classes.push("advisor-mark--overlap-mixed-violation");
            }
            return classes.join(" ");
        }
        return "advisor-mark--overlap";
    }
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
