import { diffWords } from "diff";

export interface AdvisorDiffHunk {
    id: string;
    kind: "same" | "change";
    /** Text shown for unchanged hunks, and the original side of a change. */
    text: string;
    /** Replacement text for a change hunk. */
    add: string;
    /** Whether the change is currently accepted. */
    accepted: boolean;
}

/**
 * Word-level diff between the original and corrected text, grouped into hunks
 * the user can accept or reject individually. Mirrors the approach used by
 * `RewriteDiffViewer` but exposes per-hunk state for the advisor diff preview.
 *
 * The final text is recomputed reactively from the accept/reject decisions.
 */
export function useAdvisorDiff(original: Ref<string>, corrected: Ref<string>) {
    const hunks = ref<AdvisorDiffHunk[]>([]);

    function rebuild(): void {
        const parts = diffWords(original.value, corrected.value);
        const next: AdvisorDiffHunk[] = [];
        let key = 0;

        for (let i = 0; i < parts.length; i++) {
            const current = parts[i];
            if (!current) {
                continue;
            }
            const following = parts[i + 1];

            if (current.removed && following?.added) {
                next.push({
                    id: `h${key++}`,
                    kind: "change",
                    text: current.value,
                    add: following.value,
                    accepted: true,
                });
                i++; // consume the paired insertion
                continue;
            }

            if (current.added) {
                next.push({
                    id: `h${key++}`,
                    kind: "change",
                    text: "",
                    add: current.value,
                    accepted: true,
                });
                continue;
            }

            if (current.removed) {
                next.push({
                    id: `h${key++}`,
                    kind: "change",
                    text: current.value,
                    add: "",
                    accepted: true,
                });
                continue;
            }

            next.push({
                id: `h${key++}`,
                kind: "same",
                text: current.value,
                add: "",
                accepted: true,
            });
        }

        hunks.value = next;
    }

    watch([original, corrected], rebuild, { immediate: true });

    const changeCount = computed(
        () => hunks.value.filter((h) => h.kind === "change").length,
    );
    const acceptedCount = computed(
        () =>
            hunks.value.filter((h) => h.kind === "change" && h.accepted).length,
    );

    const finalText = computed(() =>
        hunks.value
            .map((h) =>
                h.kind === "same" ? h.text : h.accepted ? h.add : h.text,
            )
            .join(""),
    );

    function setAccepted(id: string, accepted: boolean): void {
        const hunk = hunks.value.find((h) => h.id === id);
        if (hunk) {
            hunk.accepted = accepted;
        }
    }

    function acceptAll(): void {
        for (const hunk of hunks.value) {
            hunk.accepted = true;
        }
    }

    function rejectAll(): void {
        for (const hunk of hunks.value) {
            hunk.accepted = false;
        }
    }

    return {
        hunks,
        changeCount,
        acceptedCount,
        finalText,
        setAccepted,
        acceptAll,
        rejectAll,
    };
}
