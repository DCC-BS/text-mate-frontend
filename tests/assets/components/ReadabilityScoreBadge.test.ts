import { computed } from "vue";
import { mount } from "@vue/test-utils";
import ReadabilityScoreBadge from "~/components/ReadabilityScoreBadge.vue";
import type { ReadabilityScore } from "~/utils/readability";

// Stub auto-imported Nuxt helper in Vitest
vi.stubGlobal("computed", computed);

// Mock the global i18n helper
vi.stubGlobal("useI18n", () => {
    return {
        t: (key: string) => {
            const translations: Record<string, string> = {
                "flesch-score.cefr-level-a1": "Sehr einfach",
                "flesch-score.cefr-level-a2": "Einfach",
                "flesch-score.cefr-level-b1": "Mittel",
                "flesch-score.cefr-level-b2": "Gehoben",
                "flesch-score.cefr-level-c1": "Schwer",
                "flesch-score.cefr-level-c2": "Sehr schwer",
                "simplify.band.easy": "Einfach",
                "simplify.band.ok": "Mittel",
                "simplify.band.hard": "Schwer",
            };
            return translations[key] ?? key;
        },
    };
});

describe("ReadabilityScoreBadge", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing when value is unscored", () => {
        // Arrange
        const value: ReadabilityScore = {
            scored: false,
            language: "es",
        };

        // Act
        const wrapper = mount(ReadabilityScoreBadge, {
            props: { value },
        });

        // Assert
        expect(wrapper.text()).toBe("");
    });

    it("renders CEFR level and translated label for German", () => {
        // Arrange
        const value: ReadabilityScore = {
            scored: true,
            language: "de",
            cefr: "B2",
            score: 1.5,
            scoreLabel: "ZIX",
            band: "easy",
        };

        // Act
        const wrapper = mount(ReadabilityScoreBadge, {
            props: { value },
        });

        // Assert
        expect(wrapper.text()).toContain("B2");
        expect(wrapper.text()).toContain("Gehoben");
        expect(wrapper.html()).toContain("text-orange-500");
    });

    it("renders CEFR level and translated label for English", () => {
        // Arrange
        const value: ReadabilityScore = {
            scored: true,
            language: "en",
            cefr: "A1",
            score: 85.0,
            scoreLabel: "CEFR",
            band: "easy",
        };

        // Act
        const wrapper = mount(ReadabilityScoreBadge, {
            props: { value },
        });

        // Assert
        expect(wrapper.text()).toContain("A1");
        expect(wrapper.text()).toContain("Sehr einfach");
        expect(wrapper.html()).toContain("text-blue-500");
    });

    it("renders raw metric score and band label for French (LIX)", () => {
        // Arrange
        const value: ReadabilityScore = {
            scored: true,
            language: "fr",
            score: 45.8,
            scoreLabel: "LIX",
            band: "easy",
        };

        // Act
        const wrapper = mount(ReadabilityScoreBadge, {
            props: { value },
        });

        // Assert
        expect(wrapper.text()).toContain("LIX 45.8");
        expect(wrapper.text()).toContain("Einfach");
        expect(wrapper.html()).toContain("text-blue-500");
    });

    it("renders raw metric score and band label for Italian (Gulpease)", () => {
        // Arrange
        const value: ReadabilityScore = {
            scored: true,
            language: "it",
            score: 58.2,
            scoreLabel: "Gulpease",
            band: "ok",
        };

        // Act
        const wrapper = mount(ReadabilityScoreBadge, {
            props: { value },
        });

        // Assert
        expect(wrapper.text()).toContain("Gulpease 58.2");
        expect(wrapper.text()).toContain("Mittel");
        expect(wrapper.html()).toContain("text-orange-500");
    });

    it("renders compact mode with compact classes", () => {
        // Arrange
        const value: ReadabilityScore = {
            scored: true,
            language: "de",
            cefr: "C1",
            band: "hard",
        };

        // Act
        const wrapper = mount(ReadabilityScoreBadge, {
            props: { value, compact: true },
        });

        // Assert
        expect(wrapper.text()).toContain("C1");
        expect(wrapper.html()).toContain("text-xs font-bold");
        expect(wrapper.html()).toContain("hidden sm:inline");
    });
});
