import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/vue-3";
import { reflowAdvisorRanges } from "~/utils/advisorText";
import {
    buildSimplifyDecorationSpecs,
    type SimplifyDecorationSpec,
    type SimplifyRange,
} from "~/utils/simplifyRanges";

export const simplifyDecorationKey: PluginKey<DecorationSet> =
    new PluginKey<DecorationSet>("simplifyDecorations");

/**
 * Severity of the unconverged-passage highlight, keyed off the *document*
 * band, not off whether any individual passage fell short (docs
 * `simplify_redesign.md` §14.4 / the approved UX redesign): `info` when the
 * assembled text reached the target band and these are just spots worth a
 * look, `amber` when the document itself did not.
 */
export type SimplifySeverity = "info" | "amber";

export type SimplifyDecorationOptions = {
    getRanges: () => SimplifyRange[];
    getActiveId: () => string | null;
    /** Decorations render only while this returns true (ranges exist + editor visible). */
    getEnabled: () => boolean;
    getSeverity: () => SimplifySeverity;
    onSelect: (rangeId: string) => void;
    /** Called (deferred) with the ids of ranges whose text collapsed on an edit. */
    onDismiss?: (rangeIds: string[]) => void;
};

/**
 * Inline ProseMirror decoration plugin that renders every unconverged
 * passage as a highlight span. Mirrors `advisorDecorations.ts` exactly —
 * decorations (not Marks) so `getText()` stays free of markup and backend
 * offsets remain authoritative, ranges reflow through `tr.mapping` on every
 * doc change via the shared `reflowAdvisorRanges`, and a range whose text is
 * edited away auto-dismisses via {@link SimplifyDecorationOptions.onDismiss}
 * — a passage the user rewrites by hand un-flags itself.
 */
export function createSimplifyDecorationExtension(
    options: SimplifyDecorationOptions,
) {
    return Extension.create({
        name: "simplifyDecorations",

        addProseMirrorPlugins() {
            return [
                new Plugin<DecorationSet>({
                    key: simplifyDecorationKey,
                    state: {
                        init: (_config, state) => build(state),
                        apply: (tr, prev, oldState, newState) => {
                            if (tr.docChanged) {
                                const ranges = options.getRanges();
                                reflowAdvisorRanges(
                                    oldState.doc,
                                    newState.doc,
                                    tr.mapping,
                                    ranges,
                                );
                                const dismissed = ranges
                                    .filter((r) => r.range.start < 0)
                                    .map((r) => r.id);
                                if (dismissed.length && options.onDismiss) {
                                    const ids = dismissed;
                                    const cb = options.onDismiss;
                                    queueMicrotask(() => cb(ids));
                                }
                                return build(newState);
                            }
                            if (tr.getMeta(simplifyDecorationKey)) {
                                return build(newState);
                            }
                            return prev;
                        },
                    },
                    props: {
                        decorations: (state) =>
                            simplifyDecorationKey.getState(state),
                        handleClick: (view, pos) => {
                            const set = simplifyDecorationKey.getState(
                                view.state,
                            );
                            if (!set) {
                                return false;
                            }
                            const found = set.find(pos, pos)[0];
                            const rangeId = found?.spec?.rangeId;
                            if (typeof rangeId === "string") {
                                options.onSelect(rangeId);
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
        doc: Parameters<typeof buildSimplifyDecorationSpecs>[0];
    }): DecorationSet {
        // Decorations render only when enabled (ranges exist + editor visible).
        if (!options.getEnabled()) {
            return DecorationSet.empty;
        }
        const severity = options.getSeverity();
        const specs = buildSimplifyDecorationSpecs(
            state.doc,
            options.getRanges(),
            options.getActiveId(),
        );
        const decos = specs.map((spec) =>
            Decoration.inline(
                spec.from,
                spec.to,
                {
                    class: decorationClass(spec, severity),
                    "data-simplify-range-id": spec.id,
                },
                { rangeId: spec.id },
            ),
        );
        return DecorationSet.create(state.doc, decos);
    }
}

function decorationClass(
    spec: SimplifyDecorationSpec,
    severity: SimplifySeverity,
): string {
    const classes = ["simplify-mark", `simplify-mark--${severity}`];
    if (spec.active) {
        classes.push("simplify-mark--active");
    }
    return classes.join(" ");
}
