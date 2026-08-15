import { describe, expect, it } from "vitest";
import { formatNumber } from "../../../app/utils/formatNumber";

describe("formatNumber", () => {
    it("formats 0 as '0'", () => {
        expect(formatNumber(0)).toBe("0");
    });

    it("does not format numbers under 1000", () => {
        expect(formatNumber(999)).toBe("999");
        expect(formatNumber(42)).toBe("42");
        expect(formatNumber(1)).toBe("1");
    });

    it("formats 1000 as 1'000", () => {
        expect(formatNumber(1000)).toBe("1'000");
    });

    it("formats 100000 as 100'000", () => {
        expect(formatNumber(100000)).toBe("100'000");
    });

    it("formats 1000000 as 1'000'000", () => {
        expect(formatNumber(1000000)).toBe("1'000'000");
    });

    it("formats large numbers correctly with multiple separators", () => {
        expect(formatNumber(123456789)).toBe("123'456'789");
    });

    it("handles negative numbers correctly", () => {
        expect(formatNumber(-100000)).toBe("-100'000");
    });
});
