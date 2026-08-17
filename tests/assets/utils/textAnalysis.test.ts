import { describe, expect, it, vi, beforeEach } from "vitest";
import { getTextAnalysis } from "../../../app/utils/textAnalysis";
import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type { TextAnalysisResult } from "~/assets/models/text-analysis";

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

    it("should perform a POST request for German text and return German analysis result", async () => {
        // Arrange
        const text = "Dies ist ein deutscher Text für die Textanalyse.";
        const mockResult: TextAnalysisResult = {
            language: "de",
            score: 1.5,
            score_label: "ZIX",
            band: "easy",
            cefr_level: "B2",
            zix_score: 1.5,
        };

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

    it("should perform a POST request for English text and return English analysis result", async () => {
        // Arrange
        const text = "This is a simple English sentence for text analysis.";
        const mockResult: TextAnalysisResult = {
            language: "en",
            score: 68.2,
            score_label: "CEFR",
            band: "easy",
            cefr_level: "B1",
            zix_score: null,
        };

        vi.mocked(apiFetch).mockResolvedValue(mockResult);
        vi.mocked(isApiError).mockReturnValue(false);

        // Act
        const result = await getTextAnalysis(text);

        // Assert
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResult);
    });

    it("should perform a POST request for French text and return French analysis result without CEFR level", async () => {
        // Arrange
        const text = "Ceci est un texte en français pour l'analyse de lisibilité.";
        const mockResult: TextAnalysisResult = {
            language: "fr",
            score: 38.5,
            score_label: "LIX",
            band: "easy",
            cefr_level: null,
            zix_score: null,
        };

        vi.mocked(apiFetch).mockResolvedValue(mockResult);
        vi.mocked(isApiError).mockReturnValue(false);

        // Act
        const result = await getTextAnalysis(text);

        // Assert
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResult);
    });

    it("should perform a POST request for unsupported language and return null metrics", async () => {
        // Arrange
        const text = "Este es un texto en español para la prueba.";
        const mockResult: TextAnalysisResult = {
            language: "es",
            score: null,
            score_label: null,
            band: null,
            cefr_level: null,
            zix_score: null,
        };

        vi.mocked(apiFetch).mockResolvedValue(mockResult);
        vi.mocked(isApiError).mockReturnValue(false);

        // Act
        const result = await getTextAnalysis(text);

        // Assert
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResult);
    });

    it("should forward the AbortSignal correctly if provided", async () => {
        // Arrange
        const text = "Debounced text to analyze";
        const mockResult: TextAnalysisResult = {
            language: "de",
            score: -1.2,
            score_label: "ZIX",
            band: "hard",
            cefr_level: "A2",
            zix_score: -1.2,
        };
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

