import type { AdvisorThreadStatus } from "~/types/advisorV2";

/** A card to be positioned in the rail, with its anchor in the prose. */
export interface AdvisorLayoutItem {
    id: string;
    /** Card height in px. */
    height: number;
    /** Top of the anchoring mark, relative to the content box. */
    anchor: number;
    /** Vertical centre of the anchoring mark, relative to the content box. */
    mid: number;
    status: AdvisorThreadStatus;
}

export interface AdvisorLayoutGeometry {
    /** x of the prose right edge (connector start). */
    x1: number;
    /** x of the rail left edge (connector end). */
    x2: number;
    focusedId: string | null;
    /** Default connector colour. */
    connColor: string;
    /** Focused connector colour. */
    connFocusColor: string;
    /** Colour for skipped (ignored) threads. */
    connSkipColor: string;
}

export interface AdvisorConnector {
    id: string;
    d: string;
    stroke: string;
    width: number;
    opacity: number;
    cx: number;
    cy: number;
}

export interface AdvisorLayoutResult {
    /** Computed `top` (px) for each card, keyed by thread id. */
    tops: Record<string, number>;
    connectors: AdvisorConnector[];
    /** Total content height needed to fit cards and connectors. */
    height: number;
}

const GAP = 14;
/** Vertical offset from a card's top to where its connector attaches. */
const CARD_CONNECT_OFFSET = 22;

/**
 * Stacks rail cards without overlap and computes the SVG connectors that link
 * each prose mark to its card. Ported from the design prototype's `layout()`.
 *
 * When a card is focused it is pinned to its anchor and the others flow around
 * it; otherwise cards simply stack top-to-bottom from their anchors.
 */
export function computeAdvisorLayout(
    items: AdvisorLayoutItem[],
    geometry: AdvisorLayoutGeometry,
): AdvisorLayoutResult {
    const sorted = [...items].sort((a, b) => a.anchor - b.anchor);

    const tops = new Array<number>(sorted.length).fill(0);
    const focusIndex = sorted.findIndex((it) => it.id === geometry.focusedId);

    const itemAt = (index: number): AdvisorLayoutItem => {
        const item = sorted[index];
        if (!item) {
            throw new Error(`No layout item at index ${index}`);
        }
        return item;
    };

    if (focusIndex >= 0) {
        tops[focusIndex] = Math.max(0, itemAt(focusIndex).anchor);

        for (let i = focusIndex + 1; i < sorted.length; i++) {
            tops[i] = Math.max(
                itemAt(i).anchor,
                tops[i - 1] + itemAt(i - 1).height + GAP,
            );
        }

        for (let i = focusIndex - 1; i >= 0; i--) {
            tops[i] = Math.max(
                0,
                Math.min(
                    itemAt(i).anchor,
                    tops[i + 1] - GAP - itemAt(i).height,
                ),
            );
        }
    } else {
        for (let i = 0; i < sorted.length; i++) {
            tops[i] =
                i === 0
                    ? Math.max(0, itemAt(i).anchor)
                    : Math.max(
                          itemAt(i).anchor,
                          tops[i - 1] + itemAt(i - 1).height + GAP,
                      );
        }
    }

    const topsById: Record<string, number> = {};
    const connectors: AdvisorConnector[] = [];
    const midX = (geometry.x1 + geometry.x2) / 2;
    let maxBottom = 0;

    sorted.forEach((it, i) => {
        const top = Math.round(tops[i] ?? 0);
        topsById[it.id] = top;
        maxBottom = Math.max(maxBottom, top + it.height);

        const focused = it.id === geometry.focusedId;
        const skip = it.status === "skip";
        const stroke = focused
            ? geometry.connFocusColor
            : skip
              ? geometry.connSkipColor
              : geometry.connColor;
        const y1 = it.mid;
        const y2 = top + CARD_CONNECT_OFFSET;

        connectors.push({
            id: it.id,
            d: `M ${geometry.x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${geometry.x2} ${y2}`,
            stroke,
            width: focused ? 2 : 1.25,
            opacity: skip ? 0.55 : 1,
            cx: geometry.x1,
            cy: y1,
        });
    });

    return { tops: topsById, connectors, height: maxBottom + 40 };
}
