import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, readonly, ref, watch } from "vue";

/**
 * `useSimplify` folds the backend's JSON Lines event stream into reactive state.
 * The bug these tests pin down: it used to build a running preview of the
 * simplified text out of `chunk_done` events by splicing each finished unit into
 * `source.split("\n\n")` at the event's `index`.
 *
 * Those are two different coordinate spaces. `index` addresses the backend's
 * *merged* units — short paragraphs folded forward to ~100 words
 * (`docs/simplify_redesign.md` §14.2) — while the split is over raw blank-line
 * blocks. On a real document (23 units, 40-plus blocks) every unit landed at an
 * unrelated position, so the preview showed text that had never existed, and the
 * workspace entered the diff review the moment the first one arrived.
 */

// `useSimplify` relies on Nuxt auto-imports, which vitest does not provide here.
// Stubbed before the module is imported, since they are read at module scope.
vi.stubGlobal("ref", ref);
vi.stubGlobal("computed", computed);
vi.stubGlobal("readonly", readonly);
vi.stubGlobal("watch", watch);
vi.stubGlobal("useI18n", () => ({
    t: (key: string) => key,
    locale: ref("de"),
}));
vi.stubGlobal("useLogger", () => ({
    warn: () => undefined,
    error: () => undefined,
    info: () => undefined,
}));

/** The stream body `apiStreamFetch` is stubbed to return, one line per event. */
let streamedLines: string[] = [];

vi.mock("@dcc-bs/communication.bs.js", () => ({
    isApiError: () => false,
    apiStreamFetch: () => {
        const encoder = new TextEncoder();
        const lines = [...streamedLines];
        let sent = 0;
        return Promise.resolve({
            getReader: () => ({
                read: () =>
                    Promise.resolve(
                        sent < lines.length
                            ? {
                                  value: encoder.encode(`${lines[sent++]}\n`),
                                  done: false,
                              }
                            : { value: undefined, done: true },
                    ),
                releaseLock: () => undefined,
            }),
        });
    },
}));

const { useSimplify } = await import("../../../app/composables/useSimplify");

/** A source whose blank-line blocks outnumber the backend's merged units. */
const SOURCE = ["Erster Block.", "Zweiter Block.", "Dritter Block."].join(
    "\n\n",
);

function event(record: Record<string, unknown>): string {
    return JSON.stringify(record);
}

const START = event({
    event: "start",
    language: "de",
    score_label: "ZIX",
    scored: true,
    mode: "chunked",
    units: 2,
    score_before: -4,
    band_before: "hard",
    cefr_before: "C1",
});

const DONE = event({
    event: "done",
    text: "Die endgueltige Fassung.",
    language: "de",
    score_label: "ZIX",
    scored: true,
    score_before: -4,
    score_after: 1.2,
    band_after: "easy",
    cefr_after: "B1",
    converged: true,
    unconverged_units: [],
    unconverged_ranges: [],
    rewrite_failures: 0,
});

describe("useSimplify", () => {
    beforeEach(() => {
        useSimplify().reset();
        streamedLines = [];
    });

    it("shows no text until the run finishes", async () => {
        const api = useSimplify();
        streamedLines = [
            START,
            event({
                event: "chunk_done",
                index: 1,
                text: "Eine fertige Einheit.",
                attempts: 1,
                converged: true,
            }),
        ];

        await api.run(SOURCE);

        // The unit's text is deliberately dropped: its index addresses merged
        // units, which this side cannot map onto the source.
        expect(api.simplifiedText.value).toBe("");
    });

    it("never assembles a preview from unit indices", async () => {
        const api = useSimplify();
        streamedLines = [
            START,
            // Index 2 in merged-unit space. Spliced into the source's blocks it
            // would have replaced "Dritter Block." — a passage it has nothing
            // to do with.
            event({
                event: "chunk_done",
                index: 2,
                text: "VERSCHOBEN",
                attempts: 1,
                converged: true,
            }),
            DONE,
        ];

        await api.run(SOURCE);

        expect(api.simplifiedText.value).toBe("Die endgueltige Fassung.");
        expect(api.simplifiedText.value).not.toContain("VERSCHOBEN");
        expect(api.simplifiedText.value).not.toContain("Erster Block.");
    });

    it("takes its text from done, in one step", async () => {
        const api = useSimplify();
        const seen: string[] = [];
        watch(api.simplifiedText, (value) => seen.push(value));

        streamedLines = [
            START,
            event({
                event: "chunk_done",
                index: 0,
                text: "Einheit A.",
                attempts: 1,
                converged: true,
            }),
            event({
                event: "chunk_done",
                index: 1,
                text: "Einheit B.",
                attempts: 1,
                converged: true,
            }),
            DONE,
        ];

        await api.run(SOURCE);
        await Promise.resolve();

        // One transition, not one per unit. Each extra transition was a visible
        // flicker, and the first one pulled the user into the diff review while
        // the rest of the document was still being rewritten.
        expect(seen).toEqual(["Die endgueltige Fassung."]);
    });

    it("tracks the unit counter from progress events", async () => {
        const api = useSimplify();
        streamedLines = [
            START,
            event({
                event: "progress",
                attempt: 1,
                stage: "rewriting",
                units_in_target: 0,
            }),
            event({
                event: "progress",
                attempt: 1,
                stage: "rewriting",
                units_in_target: 1,
            }),
        ];

        await api.run(SOURCE);

        expect(api.progress.value.unitsTotal).toBe(2);
        expect(api.progress.value.unitsInTarget).toBe(1);
        expect(api.progress.value.stage).toBe("rewriting");
    });

    it("reports rewrite failures so an unchanged text is not read as a no-op", async () => {
        const api = useSimplify();
        streamedLines = [
            START,
            event({
                event: "done",
                text: SOURCE,
                scored: true,
                converged: false,
                unconverged_units: [0, 1],
                unconverged_ranges: [],
                rewrite_failures: 2,
            }),
        ];

        await api.run(SOURCE);

        expect(api.result.value?.rewrite_failures).toBe(2);
        expect(api.simplifiedText.value).toBe(SOURCE);
    });

    it("defaults the failure count to 0 for a backend that omits it", async () => {
        const api = useSimplify();
        streamedLines = [
            START,
            event({
                event: "done",
                text: "Fertig.",
                scored: true,
                converged: true,
                unconverged_units: [],
                unconverged_ranges: [],
            }),
        ];

        await api.run(SOURCE);

        expect(api.result.value?.rewrite_failures).toBe(0);
    });
});
