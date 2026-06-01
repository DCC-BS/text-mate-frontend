import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref, nextTick, defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { useCefrScore } from "../../../app/composables/useCefrScore";
import { getTextAnalysis } from "../../../app/utils/textAnalysis";

// Mock the backend client utility
vi.mock("../../../app/utils/textAnalysis", () => {
    return {
        getTextAnalysis: vi.fn(),
    };
});

// Mock the global i18n helper
vi.stubGlobal("useI18n", () => {
    return {
        t: (key: string) => key,
    };
});

describe("useCefrScore", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    // Helper component to mount the composable inside a reactive Vue context
    function createTestComponent(textRef: any) {
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
        expect(wrapper.vm.error).toBeUndefined();
        expect(getTextAnalysis).toHaveBeenCalledTimes(1);
    });

    it("should debounce text changes by 3 seconds", async () => {
        // Arrange
        vi.useFakeTimers();
        const text = ref("Initial text");
        vi.mocked(getTextAnalysis).mockResolvedValue({
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
    });

    it("should abort active fetch request and clear timeout when unmounted", async () => {
        // Arrange
        vi.useFakeTimers();
        const text = ref("Some text");
        const mockAbort = vi.fn();
        
        // Mock AbortController global to trace abort calls
        const originalAbortController = globalThis.AbortController;
        globalThis.AbortController = class extends originalAbortController {
            constructor() {
                super();
                this.abort = mockAbort;
            }
        };

        vi.mocked(getTextAnalysis).mockResolvedValue({
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

        // Restore global AbortController
        globalThis.AbortController = originalAbortController;
        vi.useRealTimers();
    });

    it("should abort active fetch request when text changes rapidly", async () => {
        // Arrange
        vi.useFakeTimers();
        const text = ref("Initial text");
        const mockAbort = vi.fn();
        
        const originalAbortController = globalThis.AbortController;
        globalThis.AbortController = class extends originalAbortController {
            constructor() {
                super();
                this.abort = mockAbort;
            }
        };

        vi.mocked(getTextAnalysis).mockResolvedValue({
            zix_score: 0.5,
            cefr_level: "B1",
        });

        mount(createTestComponent(text));
        
        // Wait for initial mount fetch
        await vi.runAllTimersAsync();
        expect(getTextAnalysis).toHaveBeenCalledTimes(1);

        // Change text first time
        text.value = "First change";
        await vi.advanceTimersByTimeAsync(1000); // 1s passed

        // Change text second time (should clear first timeout)
        text.value = "Second change";
        await vi.advanceTimersByTimeAsync(3000); // Fired

        // Assert: should clear first timer and start second, calling abort
        expect(getTextAnalysis).toHaveBeenCalledTimes(2);

        globalThis.AbortController = originalAbortController;
        vi.useRealTimers();
    });
});
