import {
    bandClass,
    bandLabelKey,
    cefrLevelClass,
    formatScore,
    isUnscored,
    type ReadabilityScore,
    showsCefrLevel,
    showsRawScore,
} from "~/utils/readability";

describe("readability utils", () => {
    describe("showsCefrLevel", () => {
        it("returns true for German with CEFR level", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "de",
                cefr: "B2",
                score: 1.5,
                scoreLabel: "ZIX",
            };
            expect(showsCefrLevel(score)).toBe(true);
        });

        it("returns true for English with CEFR level", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "en",
                cefr: "A2",
                score: 65,
                scoreLabel: "CEFR",
            };
            expect(showsCefrLevel(score)).toBe(true);
        });

        it("returns false for French even if CEFR level is somehow set", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "fr",
                cefr: "B1",
                score: 45.8,
                scoreLabel: "LIX",
            };
            expect(showsCefrLevel(score)).toBe(false);
        });

        it("returns false for Italian even if CEFR level is somehow set", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "it",
                cefr: "B1",
                score: 60.0,
                scoreLabel: "Gulpease",
            };
            expect(showsCefrLevel(score)).toBe(false);
        });

        it("returns false when scored is false", () => {
            const score: ReadabilityScore = {
                scored: false,
                language: "de",
                cefr: "B2",
            };
            expect(showsCefrLevel(score)).toBe(false);
        });

        it("returns false when cefr is undefined or empty", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "de",
                cefr: undefined,
            };
            expect(showsCefrLevel(score)).toBe(false);

            const scoreEmpty: ReadabilityScore = {
                scored: true,
                language: "de",
                cefr: "",
            };
            expect(showsCefrLevel(scoreEmpty)).toBe(false);
        });
    });

    describe("showsRawScore", () => {
        it("returns true for French with raw score", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "fr",
                score: 45.8,
                scoreLabel: "LIX",
                band: "easy",
            };
            expect(showsRawScore(score)).toBe(true);
        });

        it("returns true for Italian with raw score", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "it",
                score: 55.2,
                scoreLabel: "Gulpease",
                band: "ok",
            };
            expect(showsRawScore(score)).toBe(true);
        });

        it("returns false for German when CEFR level is present", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "de",
                cefr: "B2",
                score: 1.5,
                scoreLabel: "ZIX",
            };
            expect(showsRawScore(score)).toBe(false);
        });

        it("returns false when score is undefined", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "fr",
                score: undefined,
            };
            expect(showsRawScore(score)).toBe(false);
        });
    });

    describe("isUnscored", () => {
        it("returns true when scored is false", () => {
            const score: ReadabilityScore = {
                scored: false,
                language: "es",
            };
            expect(isUnscored(score)).toBe(true);
        });

        it("returns true when neither CEFR nor raw score is present", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "es",
            };
            expect(isUnscored(score)).toBe(true);
        });

        it("returns false when CEFR is present for German", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "de",
                cefr: "A1",
            };
            expect(isUnscored(score)).toBe(false);
        });

        it("returns false when raw score is present for French", () => {
            const score: ReadabilityScore = {
                scored: true,
                language: "fr",
                score: 40.5,
            };
            expect(isUnscored(score)).toBe(false);
        });
    });

    describe("formatScore", () => {
        it("formats score to 1 decimal place", () => {
            expect(formatScore(45.8333)).toBe("45.8");
            expect(formatScore(45)).toBe("45.0");
            expect(formatScore(0)).toBe("0.0");
        });
    });

    describe("cefrLevelClass", () => {
        it("returns blue for A1 and A2", () => {
            expect(cefrLevelClass("A1")).toContain("text-blue-500");
            expect(cefrLevelClass("a2")).toContain("text-blue-500");
        });

        it("returns orange for B1 and B2", () => {
            expect(cefrLevelClass("B1")).toContain("text-orange-500");
            expect(cefrLevelClass("b2")).toContain("text-orange-500");
        });

        it("returns red for C1 and C2", () => {
            expect(cefrLevelClass("C1")).toContain("text-red-500");
            expect(cefrLevelClass("c2")).toContain("text-red-500");
        });

        it("returns gray for unknown levels", () => {
            expect(cefrLevelClass(undefined)).toContain("text-gray-400");
            expect(cefrLevelClass("unknown")).toContain("text-gray-400");
        });
    });

    describe("bandClass", () => {
        it("returns correct color classes for bands", () => {
            expect(bandClass("easy")).toContain("text-blue-500");
            expect(bandClass("ok")).toContain("text-orange-500");
            expect(bandClass("hard")).toContain("text-red-500");
            expect(bandClass(undefined)).toContain("text-gray-400");
        });
    });

    describe("bandLabelKey", () => {
        it("returns i18n translation key for bands", () => {
            expect(bandLabelKey("easy")).toBe("simplify.band.easy");
            expect(bandLabelKey("ok")).toBe("simplify.band.ok");
            expect(bandLabelKey("hard")).toBe("simplify.band.hard");
        });
    });
});
