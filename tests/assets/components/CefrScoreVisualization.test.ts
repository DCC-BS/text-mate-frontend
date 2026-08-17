import { computed } from "vue";
import { mount } from "@vue/test-utils";
import CefrScoreVisualization from "~/components/CefrScoreVisualization.vue";

// Stub auto-imported Nuxt helper in Vitest
vi.stubGlobal("computed", computed);

// Mock the global i18n helper
vi.stubGlobal("useI18n", () => {
    return {
        t: (key: string, params?: Record<string, unknown>) => {
            const translations: Record<string, string> = {
                "flesch-score.cefr-level": "Sprachniveau (CEFR)",
                "flesch-score.cefr-description": "Gemeinsamer Europäischer Referenzrahmen für Sprachen",
                "flesch-score.cefr-too-short": "Text zu kurz",
                "flesch-score.cefr-level-b2": "Gehoben",
                "simplify.readability": params?.label
                    ? `Lesbarkeit (${params.label})`
                    : "Lesbarkeit",
                "simplify.readabilityDescription": "Die Lesbarkeit wird mit der für diese Sprache passenden Kennzahl gemessen.",
                "simplify.notSupported": "Sprache nicht unterstützt",
                "simplify.band.easy": "Einfach",
                "simplify.band.ok": "Mittel",
                "simplify.band.hard": "Schwer",
            };
            return translations[key] ?? key;
        },
    };
});

describe("CefrScoreVisualization", () => {
    const globalStubs = {
        UTooltip: {
            props: ["text"],
            template: "<div class=\"u-tooltip\"><slot /></div>",
        },
        USkeleton: {
            template: "<div class=\"u-skeleton\"></div>",
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders German CEFR level and band descriptor", () => {
        // Arrange & Act
        const wrapper = mount(CefrScoreVisualization, {
            props: {
                isLoading: false,
                language: "de",
                cefrLevel: "B2",
                score: 1.5,
                scoreLabel: "ZIX",
                band: "easy",
            },
            global: { stubs: globalStubs },
        });

        // Assert
        expect(wrapper.text()).toContain("Sprachniveau (CEFR)");
        expect(wrapper.text()).toContain("B2");
        expect(wrapper.text()).toContain("Gehoben");
    });

    it("renders French non-CEFR readability metric and band label", () => {
        // Arrange & Act
        const wrapper = mount(CefrScoreVisualization, {
            props: {
                isLoading: false,
                language: "fr",
                score: 45.8,
                scoreLabel: "LIX",
                band: "easy",
            },
            global: { stubs: globalStubs },
        });

        // Assert
        expect(wrapper.text()).toContain("Lesbarkeit (LIX)");
        expect(wrapper.text()).toContain("LIX 45.8");
        expect(wrapper.text()).toContain("Einfach");
    });

    it("renders Italian non-CEFR readability metric and band label", () => {
        // Arrange & Act
        const wrapper = mount(CefrScoreVisualization, {
            props: {
                isLoading: false,
                language: "it",
                score: 62.4,
                scoreLabel: "Gulpease",
                band: "ok",
            },
            global: { stubs: globalStubs },
        });

        // Assert
        expect(wrapper.text()).toContain("Lesbarkeit (Gulpease)");
        expect(wrapper.text()).toContain("Gulpease 62.4");
        expect(wrapper.text()).toContain("Mittel");
    });

    it("renders empty state 'Sprache nicht unterstützt' for unsupported languages", () => {
        // Arrange & Act
        const wrapper = mount(CefrScoreVisualization, {
            props: {
                isLoading: false,
                language: "es",
            },
            global: { stubs: globalStubs },
        });

        // Assert
        expect(wrapper.text()).toContain("Sprache nicht unterstützt");
    });

    it("renders empty state 'Text zu kurz' when no language and no score", () => {
        // Arrange & Act
        const wrapper = mount(CefrScoreVisualization, {
            props: {
                isLoading: false,
            },
            global: { stubs: globalStubs },
        });

        // Assert
        expect(wrapper.text()).toContain("Text zu kurz");
    });

    it("renders loading skeleton when isLoading is true", () => {
        // Arrange & Act
        const wrapper = mount(CefrScoreVisualization, {
            props: {
                isLoading: true,
                language: "de",
            },
            global: { stubs: globalStubs },
        });

        // Assert
        expect(wrapper.find(".u-skeleton").exists()).toBe(true);
    });

    it("renders error message when error prop is provided", () => {
        // Arrange & Act
        const wrapper = mount(CefrScoreVisualization, {
            props: {
                isLoading: false,
                language: "de",
                error: "Verbindungsfehler",
            },
            global: { stubs: globalStubs },
        });

        // Assert
        expect(wrapper.text()).toContain("Verbindungsfehler");
    });
});
