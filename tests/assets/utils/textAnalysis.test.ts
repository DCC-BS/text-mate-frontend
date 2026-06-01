import { describe, expect, it, vi, beforeEach } from "vitest";
import { getTextAnalysis } from "../../../app/utils/textAnalysis";
import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";

// Mock the backend communication library
vi.mock("@dcc-bs/communication.bs.js", () => {
    return {
        apiFetch: vi.fn(),
        isApiError: vi.fn(),
    };
});

describe("getTextAnalysis", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should perform a POST request with the correct arguments and body", async () => {
        // Arrange
        const text = "Dies ist ein Testtext für die CEFR Analyse.";
        const mockResult = { zix_score: 1.5, cefr_level: "B2" };
        
        vi.mocked(apiFetch).mockResolvedValue(mockResult);
        vi.mocked(isApiError).mockReturnValue(false);

        // Act
        const result = await getTextAnalysis(text);

        // Assert
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(apiFetch).toHaveBeenCalledWith("api/text-analysis", {
            method: "POST",
            body: { text },
            headers: {
                "Content-Type": "application/json",
            },
            signal: undefined,
        });
        expect(result).toEqual(mockResult);
    });

    it("should forward the AbortSignal correct if provided", async () => {
        // Arrange
        const text = "Debounced text to analyze";
        const mockResult = { zix_score: -1.2, cefr_level: "A2" };
        const controller = new AbortController();
        const signal = controller.signal;

        vi.mocked(apiFetch).mockResolvedValue(mockResult);
        vi.mocked(isApiError).mockReturnValue(false);

        // Act
        const result = await getTextAnalysis(text, signal);

        // Assert
        expect(apiFetch).toHaveBeenCalledWith("api/text-analysis", expect.objectContaining({
            signal,
        }));
        expect(result).toEqual(mockResult);
    });

    it("should throw the error response if isApiError evaluates to true", async () => {
        // Arrange
        const text = "Shorter text";
        const mockError = { errorId: "text_analysis_error", message: "Failed analysis" };

        vi.mocked(apiFetch).mockResolvedValue(mockError);
        vi.mocked(isApiError).mockReturnValue(true);

        // Act & Assert
        await expect(getTextAnalysis(text)).rejects.toEqual(mockError);
    });
});
