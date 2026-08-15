import { v7 } from "uuid";
import type {
    OffsetRange,
    SimplifyRange,
    SimplifyRangeKind,
} from "~/utils/simplifyRanges";

export function useSimplifyRanges() {
    const ranges = useState<SimplifyRange[]>("simplify-ranges", () => []);
    const activeRangeId = useState<string | undefined>(
        "simplify-active-range-id",
        () => undefined,
    );

    const orderedRanges = computed<SimplifyRange[]>(() =>
        ranges.value.toSorted((a, b) => a.range.start - b.range.start),
    );

    const activeIndex = computed<number>(() =>
        orderedRanges.value.findIndex((r) => r.id === activeRangeId.value),
    );

    function setRanges(
        raw: readonly (OffsetRange & { kind?: SimplifyRangeKind })[],
    ): void {
        ranges.value = raw.map((r) => ({
            id: v7(),
            range: { start: r.start, end: r.end },
            kind: r.kind ?? "rewritten",
        }));
        activeRangeId.value = orderedRanges.value[0]?.id;
    }

    function clear(): void {
        ranges.value = [];
        activeRangeId.value = undefined;
    }

    function dismiss(ids: readonly string[]): void {
        const idSet = new Set(ids);
        ranges.value = ranges.value.filter((r) => !idSet.has(r.id));
        if (
            activeRangeId.value !== undefined &&
            idSet.has(activeRangeId.value)
        ) {
            activeRangeId.value = orderedRanges.value[0]?.id;
        }
    }

    function selectRange(id: string): void {
        activeRangeId.value = id;
    }

    function next(): void {
        const list = orderedRanges.value;
        if (list.length === 0) {
            return;
        }
        const nextIndex =
            activeIndex.value === -1
                ? 0
                : (activeIndex.value + 1) % list.length;
        activeRangeId.value = list[nextIndex]?.id;
    }

    function prev(): void {
        const list = orderedRanges.value;
        if (list.length === 0) {
            return;
        }
        const prevIndex =
            activeIndex.value === -1
                ? list.length - 1
                : (activeIndex.value - 1 + list.length) % list.length;
        activeRangeId.value = list[prevIndex]?.id;
    }

    return {
        ranges,
        orderedRanges,
        activeRangeId,
        activeIndex,
        setRanges,
        clear,
        dismiss,
        selectRange,
        next,
        prev,
    };
}
