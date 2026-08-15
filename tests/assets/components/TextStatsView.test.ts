import { computed, ref } from "vue";
import { mount } from "@vue/test-utils";
import TextStatsView from "~/components/tool-panel/TextStatsView.vue";

// Stub auto-imported Nuxt helper in Vitest
vi.stubGlobal("computed", computed);
vi.stubGlobal("ref", ref);

// Mock composables
vi.mock("~/composables/useTextStats", () => ({
    useTextStats: () => ({
        charCount: ref(70),
        wordCount: ref(16),
        syllableCount: ref(19),
        averageSentenceLength: ref(8.5),
        averageSyllablesPerWord: ref(1.19),
    }),
}));

const mockCefrState = {
    isLoading: ref(false),
    cefrLevel: ref<string | undefined>("A1"),
    language: ref<string | undefined>("en"),
    score: ref<number | undefined>(85.0),
    scoreLabel: ref<string | undefined>("CEFR"),
    band: ref<string | undefined>("easy"),
    error: ref<string | undefined>(undefined),
};

vi.mock("~/composables/useCefrScore", () => ({
    useCefrScore: () => mockCefrState,
}));

// Mock the global i18n helper
vi.stubGlobal("useI18n", () => {
    return {
        t: (key: string) => {
            const translations: Record<string, string> = {
                "text-stats.character-count": "Zeichenanzahl",
                "text-stats.word-count": "Wortanzahl",
                "text-stats.syllable-count": "Silbenanzahl",
                "text-stats.average-sentence-length": "Durchschnittliche Satzlänge",
                "text-stats.average-syllables-per-word": "Durchschnittliche Silben pro Wort",
                "text-stats.language": "Erkannte Sprache",
            };
            return translations[key] ?? key;
        },
    };
});

describe("TextStatsView", () => {
    const globalStubs = {
        CefrScoreVisualization: {
            template: "<div class=\"cefr-visualization-stub\"></div>",
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockCefrState.language.value = "en";
    });

    it("renders text statistics including detected language row", () => {
        const wrapper = mount(TextStatsView, {
            props: {
                text: "Sample English text for testing statistics calculation.",
            },
            global: { stubs: globalStubs },
        });

        expect(wrapper.text()).toContain("Zeichenanzahl");
        expect(wrapper.find('[data-testid="characterCount"]').text()).toBe("70");
        expect(wrapper.text()).toContain("Erkannte Sprache");
        expect(wrapper.find('[data-testid="detectedLanguage"]').text()).toBe(
            "English (EN)",
        );
    });

    it("formats different language codes appropriately", async () => {
        mockCefrState.language.value = "de";

        const wrapper = mount(TextStatsView, {
            props: {
                text: "Deutscher Text",
            },
            global: { stubs: globalStubs },
        });

        expect(wrapper.find('[data-testid="detectedLanguage"]').text()).toBe(
            "Deutsch (DE)",
        );
    });
});
