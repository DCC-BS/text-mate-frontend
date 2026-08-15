import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref, nextTick, defineComponent, type Ref } from "vue";
import { mount } from "@vue/test-utils";
import { useCefrScore } from "../../../app/composables/useCefrScore";
import { getTextAnalysis } from "../../../app/utils/textAnalysis";
import type { TextAnalysisResult } from "~/assets/models/text-analysis";

// Mock the backend client utility
vi.mock("../../../app/utils/textAnalysis", () => {
    return {
        getTextAnalysis: vi.fn(),
    };
});

const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
};

// Mock the global i18n helper
vi.stubGlobal("useI18n", () => {
    return {
        t: (key: string) => key,
    };
});

vi.stubGlobal("useLogger", () => mockLogger);

describe("useCefrScore", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    // Helper component to mount the composable inside a reactive Vue context
    function createTestComponent(textRef: Ref<string>) {
        return defineComponent({
            setup() {
                const cefrState = useCefrScore(textRef);
                return { ...cefrState };
            },
            template: "<div></div>",
        });
    }

    it("should fetch CEFR score immediately on mount", async () => {
        // Arrange
        const text = ref("Dies ist ein längerer deutscher Beispieltext für den Test.");
        vi.mocked(getTextAnalysis).mockResolvedValue({
            language: "de",
            score: 2.1,
            score_label: "ZIX",
            band: "easy",
            zix_score: 2.1,
            cefr_level: "C1",
        });

        // Act
        const wrapper = mount(createTestComponent(text));

        // Assert: initially should be loading
        expect(wrapper.vm.isLoading).toBe(true);

        // Wait for async fetch to complete
        await nextTick();
        await nextTick();
        await nextTick();

        expect(wrapper.vm.isLoading).toBe(false);
        expect(wrapper.vm.cefrLevel).toBe("C1");
        expect(wrapper.vm.zixScore).toBe(2.1);
        expect(wrapper.vm.language).toBe("de");
        expect(wrapper.vm.score).toBe(2.1);
        expect(wrapper.vm.scoreLabel).toBe("ZIX");
        expect(wrapper.vm.band).toBe("easy");
        expect(wrapper.vm.error).toBeUndefined();
        expect(getTextAnalysis).toHaveBeenCalledTimes(1);
    });

    it("should handle German text analysis with CEFR level and ZIX score", async () => {
        // Arrange
        const text = ref("Dies ist ein deutscher Beispieltext.");
        const mockResult: TextAnalysisResult = {
            language: "de",
            score: 1.5,
            score_label: "ZIX",
            band: "easy",
            cefr_level: "B2",
            zix_score: 1.5,
        };
        vi.mocked(getTextAnalysis).mockResolvedValue(mockResult);

        // Act
        const wrapper = mount(createTestComponent(text));
        await nextTick();
        await nextTick();
        await nextTick();

        // Assert
        expect(wrapper.vm.isLoading).toBe(false);
        expect(wrapper.vm.language).toBe("de");
        expect(wrapper.vm.score).toBe(1.5);
        expect(wrapper.vm.scoreLabel).toBe("ZIX");
        expect(wrapper.vm.band).toBe("easy");
        expect(wrapper.vm.cefrLevel).toBe("B2");
        expect(wrapper.vm.zixScore).toBe(1.5);
    });

    it("should handle English text analysis with CEFR level and score", async () => {
        // Arrange
        const text = ref("This is a simple English sentence.");
        const mockResult: TextAnalysisResult = {
            language: "en",
            score: 68.2,
            score_label: "CEFR",
            band: "easy",
            cefr_level: "B1",
            zix_score: null,
        };
        vi.mocked(getTextAnalysis).mockResolvedValue(mockResult);

        // Act
        const wrapper = mount(createTestComponent(text));
        await nextTick();
        await nextTick();
        await nextTick();

        // Assert
        expect(wrapper.vm.isLoading).toBe(false);
        expect(wrapper.vm.language).toBe("en");
        expect(wrapper.vm.score).toBe(68.2);
        expect(wrapper.vm.scoreLabel).toBe("CEFR");
        expect(wrapper.vm.band).toBe("easy");
        expect(wrapper.vm.cefrLevel).toBe("B1");
        expect(wrapper.vm.zixScore).toBeUndefined();
    });

    it("should handle French text analysis with LIX score and band (non-CEFR)", async () => {
        // Arrange
        const text = ref("Ceci est un texte en français pour l'évaluation.");
        const mockResult: TextAnalysisResult = {
            language: "fr",
            score: 38.5,
            score_label: "LIX",
            band: "easy",
            cefr_level: null,
            zix_score: null,
        };
        vi.mocked(getTextAnalysis).mockResolvedValue(mockResult);

        // Act
        const wrapper = mount(createTestComponent(text));
        await nextTick();
        await nextTick();
        await nextTick();

        // Assert
        expect(wrapper.vm.isLoading).toBe(false);
        expect(wrapper.vm.language).toBe("fr");
        expect(wrapper.vm.score).toBe(38.5);
        expect(wrapper.vm.scoreLabel).toBe("LIX");
        expect(wrapper.vm.band).toBe("easy");
        expect(wrapper.vm.cefrLevel).toBeUndefined();
        expect(wrapper.vm.zixScore).toBeUndefined();
    });

    it("should handle Italian text analysis with Gulpease score and band (non-CEFR)", async () => {
        // Arrange
        const text = ref("Questo è un testo in italiano per la valutazione.");
        const mockResult: TextAnalysisResult = {
            language: "it",
            score: 75.0,
            score_label: "Gulpease",
            band: "ok",
            cefr_level: null,
            zix_score: null,
        };
        vi.mocked(getTextAnalysis).mockResolvedValue(mockResult);

        // Act
        const wrapper = mount(createTestComponent(text));
        await nextTick();
        await nextTick();
        await nextTick();

        // Assert
        expect(wrapper.vm.isLoading).toBe(false);
        expect(wrapper.vm.language).toBe("it");
        expect(wrapper.vm.score).toBe(75.0);
        expect(wrapper.vm.scoreLabel).toBe("Gulpease");
        expect(wrapper.vm.band).toBe("ok");
        expect(wrapper.vm.cefrLevel).toBeUndefined();
        expect(wrapper.vm.zixScore).toBeUndefined();
    });

    it("should handle unsupported language with language code and null scores", async () => {
        // Arrange
        const text = ref("Este es un texto en español no soportado para análisis.");
        const mockResult: TextAnalysisResult = {
            language: "es",
            score: null,
            score_label: null,
            band: null,
            cefr_level: null,
            zix_score: null,
        };
        vi.mocked(getTextAnalysis).mockResolvedValue(mockResult);

        // Act
        const wrapper = mount(createTestComponent(text));
        await nextTick();
        await nextTick();
        await nextTick();

        // Assert
        expect(wrapper.vm.isLoading).toBe(false);
        expect(wrapper.vm.language).toBe("es");
        expect(wrapper.vm.score).toBeUndefined();
        expect(wrapper.vm.scoreLabel).toBeUndefined();
        expect(wrapper.vm.band).toBeUndefined();
        expect(wrapper.vm.cefrLevel).toBeUndefined();
        expect(wrapper.vm.zixScore).toBeUndefined();
    });

    it("should debounce text changes by 3 seconds", async () => {
        // Arrange
        vi.useFakeTimers();
        const text = ref("Initial text");
        vi.mocked(getTextAnalysis).mockResolvedValue({
            language: "de",
            score: 1.0,
            score_label: "ZIX",
            band: "easy",
            zix_score: 1.0,
            cefr_level: "B2",
        });

        // Act: Mount component (triggers immediate initial evaluation)
        const wrapper = mount(createTestComponent(text));
        
        await vi.runAllTimersAsync();
        expect(getTextAnalysis).toHaveBeenCalledTimes(1);

        // Change text (triggers watch)
        text.value = "Updated text after editing in editor";

        // Advance timer by 1500ms (should not trigger yet due to 3s debounce)
        await vi.advanceTimersByTimeAsync(1500);
        expect(getTextAnalysis).toHaveBeenCalledTimes(1);

        // Advance remaining 1500ms (should trigger the debounced fetch)
        await vi.advanceTimersByTimeAsync(1500);
        expect(getTextAnalysis).toHaveBeenCalledTimes(2);

        vi.useRealTimers();
    });

    it("should gracefully capture and display error state on API failure", async () => {
        // Arrange
        const text = ref("Invalid input");
        const mockError = new Error("Connection failed");
        vi.mocked(getTextAnalysis).mockRejectedValue(mockError);

        // Act
        const wrapper = mount(createTestComponent(text));

        // Wait for async evaluations to finish
        await nextTick();
        await nextTick();
        await nextTick();

        // Assert
        expect(wrapper.vm.isLoading).toBe(false);
        expect(wrapper.vm.error).toBe("Connection failed");
        expect(wrapper.vm.cefrLevel).toBeUndefined();
        expect(mockLogger.error).toHaveBeenCalledWith(
            { err: mockError },
            "Failed to fetch CEFR understandability score",
        );
    });

    it("should abort active fetch request and clear timeout when unmounted", async () => {
        // Arrange
        vi.useFakeTimers();
        const text = ref("Some text");
        const mockAbort = vi.fn();

        // Mock AbortController global to trace abort calls
        const originalAbortController = globalThis.AbortController;
        try {
            globalThis.AbortController = class extends originalAbortController {
                constructor() {
                    super();
                    this.abort = mockAbort;
                }
            };

            vi.mocked(getTextAnalysis).mockResolvedValue({
                language: "de",
                score: 1.0,
                score_label: "ZIX",
                band: "easy",
                zix_score: 1.0,
                cefr_level: "B2",
            });

            const wrapper = mount(createTestComponent(text));

            // Wait for initial mount fetch
            await vi.runAllTimersAsync();
            expect(getTextAnalysis).toHaveBeenCalledTimes(1);

            // Change text (triggers watch + debounce)
            text.value = "New text";
            await vi.advanceTimersByTimeAsync(1500); // 1.5s passed

            // Act: Unmount component (which happens when stats popover is closed)
            wrapper.unmount();

            // Assert: timeout should be cleared, abort should be called
            expect(mockAbort).toHaveBeenCalled();

            // Advance remaining time: should NOT execute the second fetch
            await vi.advanceTimersByTimeAsync(1500);
            expect(getTextAnalysis).toHaveBeenCalledTimes(1); // Still 1
        } finally {
            // Restore global AbortController
            globalThis.AbortController = originalAbortController;
            vi.useRealTimers();
        }
    });

    it("should abort active fetch request when text changes rapidly", async () => {
        // Arrange
        vi.useFakeTimers();
        const text = ref("Initial text");
        const mockAbort = vi.fn();

        let resolveRequest1: (value: TextAnalysisResult) => void = () => {};
        const promise1 = new Promise<TextAnalysisResult>((resolve) => {
            resolveRequest1 = resolve;
        });

        let callCount = 0;
        vi.mocked(getTextAnalysis).mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                return promise1;
            }
            return Promise.resolve({
                language: "de",
                score: 0.5,
                score_label: "ZIX",
                band: "easy",
                zix_score: 0.5,
                cefr_level: "B1",
            });
        });

        const originalAbortController = globalThis.AbortController;
        try {
            globalThis.AbortController = class extends originalAbortController {
                constructor() {
                    super();
                    this.abort = mockAbort;
                }
            };

            mount(createTestComponent(text));

            // Wait for initial mount fetch to start and settle (timers run, but promise1 is pending)
            await vi.runAllTimersAsync();
            expect(callCount).toBe(1);
            expect(mockAbort).not.toHaveBeenCalled();

            // Change text first time (triggers watch + debounce)
            text.value = "First change";

            // Advance by 3000ms to trigger the debounced evaluateText
            await vi.advanceTimersByTimeAsync(3000);

            // Assert: evaluateText should abort the in-flight Request 1, so mockAbort is called
            expect(mockAbort).toHaveBeenCalledTimes(1);
            expect(callCount).toBe(2);

            // Resolve Request 1 to cleanly settle the first pending promise
            resolveRequest1({
                language: "de",
                score: 0.5,
                score_label: "ZIX",
                band: "easy",
                zix_score: 0.5,
                cefr_level: "B1",
            });
            await vi.runAllTimersAsync();
        } finally {
            // Restore global AbortController
            globalThis.AbortController = originalAbortController;
            vi.useRealTimers();
        }
    });

    it("should not set isLoading to false when a previous request is aborted and completes after a new request starts", async () => {
        // Arrange
        vi.useFakeTimers();
        try {
            const text = ref("First text for analysis");

            let rejectRequest1: (reason: unknown) => void = () => {};
            let resolveRequest2: (value: TextAnalysisResult) => void = () => {};

            const promise1 = new Promise<TextAnalysisResult>((_, reject) => {
                rejectRequest1 = reject;
            });
            const promise2 = new Promise<TextAnalysisResult>((resolve) => {
                resolveRequest2 = resolve;
            });

            let callCount = 0;
            vi.mocked(getTextAnalysis).mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return promise1;
                }
                return promise2;
            });

            // Mount (starts Request 1)
            const wrapper = mount(createTestComponent(text));

            // Let Request 1 run
            await vi.runAllTimersAsync();
            expect(callCount).toBe(1);
            expect(wrapper.vm.isLoading).toBe(true);

            // Trigger Request 2 (change text, then advance timers to trigger debounced evaluateText)
            text.value = "Second text for analysis";
            await vi.advanceTimersByTimeAsync(3000);
            expect(callCount).toBe(2);
            expect(wrapper.vm.isLoading).toBe(true);

            // Reject Request 1 with AbortError (simulate the abortion completion)
            rejectRequest1(new DOMException("The user aborted a request.", "AbortError"));

            // Wait for promises to settle
            await vi.runAllTimersAsync();

            // Assert: isLoading should STILL be true because Request 2 is still active
            expect(wrapper.vm.isLoading).toBe(true);

            // Resolve Request 2
            resolveRequest2({
                language: "de",
                score: 2.0,
                score_label: "ZIX",
                band: "easy",
                zix_score: 2.0,
                cefr_level: "C1",
            });
            await vi.runAllTimersAsync();

            // Assert: isLoading is now false, and success state is set
            expect(wrapper.vm.isLoading).toBe(false);
            expect(wrapper.vm.cefrLevel).toBe("C1");
        } finally {
            vi.useRealTimers();
        }
    });
});

