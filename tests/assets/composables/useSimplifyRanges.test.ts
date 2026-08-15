import { beforeEach, describe, expect, it } from "vitest";
import { useSimplifyRanges } from "../../../app/composables/useSimplifyRanges";

describe("useSimplifyRanges", () => {
    // Module-level singleton state (matching useSimplify/useWorkspace): reset
    // between tests so cases don't leak into each other.
    beforeEach(() => {
        useSimplifyRanges().clear();
    });

    it("starts empty", () => {
        const api = useSimplifyRanges();
        expect(api.ranges.value).toEqual([]);
        expect(api.activeRangeId.value).toBeUndefined();
        expect(api.activeIndex.value).toBe(-1);
    });

    it("setRanges assigns fresh ids and activates the first range", () => {
        const api = useSimplifyRanges();
        api.setRanges([
            { start: 10, end: 20 },
            { start: 30, end: 40 },
        ]);

        expect(api.ranges.value).toHaveLength(2);
        expect(api.activeRangeId.value).toBe(api.ranges.value[0]?.id);
        expect(api.activeIndex.value).toBe(0);
    });

    it("orders ranges by document position regardless of input order", () => {
        const api = useSimplifyRanges();
        api.setRanges([
            { start: 100, end: 110 },
            { start: 10, end: 20 },
        ]);

        expect(api.orderedRanges.value.map((r) => r.range.start)).toEqual([
            10, 100,
        ]);
    });

    it("next() cycles forward through ranges in document order and wraps", () => {
        const api = useSimplifyRanges();
        api.setRanges([
            { start: 10, end: 20 },
            { start: 30, end: 40 },
            { start: 50, end: 60 },
        ]);
        const [r0, r1, r2] = api.orderedRanges.value;

        expect(api.activeRangeId.value).toBe(r0?.id);
        api.next();
        expect(api.activeRangeId.value).toBe(r1?.id);
        api.next();
        expect(api.activeRangeId.value).toBe(r2?.id);
        api.next(); // wraps around
        expect(api.activeRangeId.value).toBe(r0?.id);
    });

    it("prev() cycles backward and wraps", () => {
        const api = useSimplifyRanges();
        api.setRanges([
            { start: 10, end: 20 },
            { start: 30, end: 40 },
        ]);
        const [r0, r1] = api.orderedRanges.value;

        expect(api.activeRangeId.value).toBe(r0?.id);
        api.prev(); // wraps to the last range
        expect(api.activeRangeId.value).toBe(r1?.id);
        api.prev();
        expect(api.activeRangeId.value).toBe(r0?.id);
    });

    it("next()/prev() are no-ops when there are no ranges", () => {
        const api = useSimplifyRanges();
        api.next();
        api.prev();
        expect(api.activeRangeId.value).toBeUndefined();
    });

    it("selectRange sets the active range directly", () => {
        const api = useSimplifyRanges();
        api.setRanges([
            { start: 10, end: 20 },
            { start: 30, end: 40 },
        ]);
        const target = api.ranges.value[1];
        expect(target).toBeDefined();
        if (!target) return;

        api.selectRange(target.id);
        expect(api.activeRangeId.value).toBe(target.id);
        expect(api.activeIndex.value).toBe(1);
    });

    it("dismiss drops the given ranges and reassigns the active one if it was dismissed", () => {
        const api = useSimplifyRanges();
        api.setRanges([
            { start: 10, end: 20 },
            { start: 30, end: 40 },
        ]);
        const [r0, r1] = api.orderedRanges.value;
        expect(r0).toBeDefined();
        expect(r1).toBeDefined();
        if (!r0 || !r1) return;

        api.dismiss([r0.id]);

        expect(api.ranges.value).toHaveLength(1);
        expect(api.ranges.value[0]?.id).toBe(r1.id);
        expect(api.activeRangeId.value).toBe(r1.id);
    });

    it("dismiss leaves the active range untouched when a different range is dismissed", () => {
        const api = useSimplifyRanges();
        api.setRanges([
            { start: 10, end: 20 },
            { start: 30, end: 40 },
        ]);
        const [r0, r1] = api.orderedRanges.value;
        expect(r1).toBeDefined();
        if (!r1) return;

        api.dismiss([r1.id]);

        expect(api.ranges.value).toHaveLength(1);
        expect(api.activeRangeId.value).toBe(r0?.id);
    });

    it("clear empties the ranges and the active id", () => {
        const api = useSimplifyRanges();
        api.setRanges([{ start: 10, end: 20 }]);
        api.clear();

        expect(api.ranges.value).toEqual([]);
        expect(api.activeRangeId.value).toBeUndefined();
        expect(api.activeIndex.value).toBe(-1);
    });
});
