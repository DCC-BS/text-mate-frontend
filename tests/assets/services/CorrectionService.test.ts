import type { ILogger } from "@dcc-bs/logger.bs.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ICommand } from "#build/types/commands";
import type { TextCorrectionBlock } from "../../../app/assets/models/text-correction";
import type { ICorrectionFetcher } from "../../../app/assets/services/CorrectionFetcher";
import { CorrectionService } from "../../../app/assets/services/CorrectionService";

// Sample correction block for testing
const sampleBlock: TextCorrectionBlock = {
    id: "test-id",
    original: "teh",
    corrected: ["the", "tech"],
    explanation: "Common misspelling",
    offset: 0,
    length: 3,
};

/**
 * Tests for the CorrectionService class
 */
describe("CorrectionService", () => {
    // Mock dependencies
    let mockLogger: ILogger;
    let mockExecuteCommand: ReturnType<typeof vi.fn>;
    let mockOnError: ReturnType<typeof vi.fn>;
    let mockCorrectionFetcher: ICorrectionFetcher;
    let correctionService: CorrectionService;

    beforeEach(() => {
        // Setup mocks
        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        } as unknown as ILogger;

        mockExecuteCommand = vi.fn().mockResolvedValue(undefined);
        mockOnError = vi.fn();

        // Mock the ICorrectionFetcher
        mockCorrectionFetcher = {
            language: "en",
            fetchBlocks: vi.fn().mockResolvedValue([sampleBlock]),
        };

        // Create instance of service to test
        correctionService = new CorrectionService(
            mockLogger,
            mockCorrectionFetcher,
            mockExecuteCommand as unknown as (
                command: ICommand,
            ) => Promise<void>,
            mockOnError,
            "en",
        );
    });

    describe("correctionText called twice with the same text", () => {
        it("should not call fetchBlocks again", async () => {
            // Arrange
            const text = "teh quick brown fox";
            const signal = new AbortController().signal;
            const fetchBlocksSpy = vi.spyOn(
                mockCorrectionFetcher,
                "fetchBlocks",
            );

            // Act
            await correctionService.correctText(text, signal);
            vi.resetAllMocks();

            await correctionService.correctText(text, signal);

            // Assert
            expect(fetchBlocksSpy).not.toHaveBeenCalled();
            expect(mockExecuteCommand).not.toHaveBeenCalled();
        });
    });

    describe("correctionText", () => {
        it("postfix has changed ", async () => {
            // Arrange
            const text = "teh quick brown fox.";
            const newText = " Some new text";
            const signal = new AbortController().signal;

            // Act
            await correctionService.correctText(text, signal);
            mockExecuteCommand.mockReset();
            await correctionService.correctText(`${text}${newText}`, signal);

            // Assert
            expect(mockCorrectionFetcher.fetchBlocks).toHaveBeenCalledWith(
                newText,
                signal,
            );

            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    $type: "CorrectionBlockChangedCommand",
                    change: "add",
                }),
            );

            expect(mockExecuteCommand).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    $type: "CorrectionBlockChangedCommand",
                    change: "update",
                }),
            );
        });

        it("prefix has changed ", async () => {
            // Arrange
            const text = "teh quick brown fox.";
            const newText = "Some new text teh quick brown fox.";
            const signal = new AbortController().signal;

            // Act
            await correctionService.correctText(text, signal);
            mockExecuteCommand.mockReset();
            await correctionService.correctText(`${newText}${text}`, signal);

            // Assert
            expect(mockCorrectionFetcher.fetchBlocks).toHaveBeenCalledWith(
                newText,
                signal,
            );

            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    $type: "CorrectionBlockChangedCommand",
                    change: "add",
                }),
            );

            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    $type: "CorrectionBlockChangedCommand",
                    change: "update",
                }),
            );
        });

        it("should not call fetchBlocks if text is empty", async () => {
            // Arrange
            const text = "";
            const signal = new AbortController().signal;

            // Act
            await correctionService.correctText(text, signal);

            // Assert
            expect(mockCorrectionFetcher.fetchBlocks).not.toHaveBeenCalled();
        });

        it("should not call fetchBlocks if text is the same", async () => {
            // Arrange
            const text = "teh quick brown fox";
            const signal = new AbortController().signal;

            // Act
            await correctionService.correctText(text, signal);
            await correctionService.correctText(text, signal);

            // Assert
            expect(mockCorrectionFetcher.fetchBlocks).toHaveBeenCalledOnce();
        });

        it.each`
            prefix       | postfix
            ${"prefix."} | ${"postfix"}
            ${""}        | ${"postfix"}
            ${"prefix."} | ${""}
            ${""}        | ${""}
        `("Replace char with new char", async ({ prefix, postfix }) => {
            // Arrange
            const text = "teh quick brown fox.";
            const newText = "teh quiick brown fox.";
            const signal = new AbortController().signal;

            const blocks = [
                {
                    id: "test-id-2",
                    original: "quiick",
                    offset: 4,
                    length: 6,
                },
            ] as TextCorrectionBlock[];

            mockCorrectionFetcher.fetchBlocks = vi.fn().mockResolvedValue([]);

            // Act
            await correctionService.correctText(
                `${prefix}${text}${postfix}`,
                signal,
            );
            mockExecuteCommand.mockReset();
            mockCorrectionFetcher.fetchBlocks = vi
                .fn()
                .mockResolvedValue([blocks]);
            await correctionService.correctText(
                `${prefix}${newText}${postfix}`,
                signal,
            );

            // Assert
            expect(mockCorrectionFetcher.fetchBlocks).toHaveBeenCalledWith(
                `${newText}`,
                signal,
            );

            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    $type: "CorrectionBlockChangedCommand",
                    change: "add",
                }),
            );
        });

        it("Speelling error was corrected", async () => {
            // Arrange
            const text = "Some prefix. teh quick brown fox. Some postfix.";
            const newText = "Some prefix. The quick brown fox. Some postfix.";
            const signal = new AbortController().signal;

            const blocks = [
                {
                    id: "test-id-2",
                    original: "teh",
                    offset: 13,
                    length: 3,
                },
            ] as TextCorrectionBlock[];

            const expectedBlock = {
                ...blocks[0],
                offset: 14, // 1 based index
            };

            mockCorrectionFetcher.fetchBlocks = vi
                .fn()
                .mockImplementation(async (text: string, _) => {
                    if (text.includes("teh")) {
                        return blocks;
                    }
                    return [];
                });

            // Act
            await correctionService.correctText(`${text}`, signal);
            mockExecuteCommand.mockReset();
            mockCorrectionFetcher.fetchBlocks = vi.fn().mockResolvedValue([]);
            await correctionService.correctText(`${newText}`, signal);

            // Assert
            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    $type: "CorrectionBlockChangedCommand",
                    change: "remove",
                    block: expectedBlock,
                }),
            );
        });

        it("Offset is updated correctly on text move", async () => {
            // Arrange
            const text = "teh quick brown fox.";
            const newText = "   .teh quick brown fox.";
            const signal = new AbortController().signal;

            const blocks = [
                {
                    id: "test-id-2",
                    original: "teh",
                    offset: 0,
                    length: 3,
                },
            ] as TextCorrectionBlock[];

            const expectedBlock = {
                id: "test-id-2",
                original: "teh",
                offset: 5,
                length: 3,
            } as TextCorrectionBlock;

            mockCorrectionFetcher.fetchBlocks = vi
                .fn()
                .mockImplementation(async (text: string, _) => {
                    if (text.includes("teh")) {
                        return blocks;
                    }
                    return [];
                });

            // Act
            await correctionService.correctText(`${text}`, signal);
            mockCorrectionFetcher.fetchBlocks = vi.fn().mockResolvedValue([]);
            await correctionService.correctText(`${newText}`, signal);

            // Assert
            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    $type: "CorrectionBlockChangedCommand",
                    change: "update",
                    block: expectedBlock,
                }),
            );
        });
    });

    // No need to restore fetch since we're mocking the CorrectionFetcher directly

    describe("switchLanguage", () => {
        it("should update the language if different", async () => {
            // Arrange
            const newLanguage = "de";

            // Act
            await correctionService.correctText(
                "test",
                new AbortController().signal,
            );

            mockExecuteCommand.mockReset();

            await correctionService.switchLanguage(newLanguage);

            expect(mockCorrectionFetcher.fetchBlocks).toHaveBeenCalledWith(
                "test",
                expect.any(AbortSignal),
            );
        });

        it("should not make any changes if language is the same", async () => {
            // Arrange
            const initialLanguage = "en";

            // Act
            await correctionService.switchLanguage(initialLanguage);

            // Assert - use a public method that will reveal the language change
            await correctionService.correctText(
                "test",
                new AbortController().signal,
            );

            expect(mockCorrectionFetcher.fetchBlocks).toHaveBeenCalledWith(
                "test",
                expect.any(AbortSignal),
            );
        });
    });

    describe("correctText", () => {
        it("should fetch corrections and execute commands", async () => {
            // Arrange
            const text = "teh quick brown fox";
            const signal = new AbortController().signal;

            // Act
            await correctionService.correctText(text, signal);

            // Assert
            expect(mockCorrectionFetcher.fetchBlocks).toHaveBeenCalledWith(
                text,
                signal,
            );

            // Validate command execution
            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    $type: "CorrectionBlockChangedCommand",
                }),
            );
        });

        it("should handle the case when request is aborted", async () => {
            // Arrange
            const text = "teh quick brown fox";
            const controller = new AbortController();
            const signal = controller.signal;

            // Mock fetchBlocks to throw an aborted error
            (
                mockCorrectionFetcher.fetchBlocks as ReturnType<typeof vi.fn>
            ).mockRejectedValueOnce(
                new Error("Request aborted", { cause: "aborted" }),
            );

            // Act
            await correctionService.correctText(text, signal);

            // Assert
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining("aborted"),
            );
            expect(mockExecuteCommand).not.toHaveBeenCalled();
        });

        it("should handle errors during correction", async () => {
            // Arrange
            const text = "teh quick brown fox";
            const signal = new AbortController().signal;
            const errorMessage = "Network error";

            // Mock fetchBlocks to throw an error
            (
                mockCorrectionFetcher.fetchBlocks as ReturnType<typeof vi.fn>
            ).mockRejectedValueOnce(new Error(errorMessage));

            // Act
            await correctionService.correctText(text, signal);

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining(errorMessage),
            );
            expect(mockOnError).toHaveBeenCalledWith(errorMessage);
        });
    });

    describe("invalidateAll", () => {
        it("should remove all correction blocks", async () => {
            // Arrange - first add some corrections
            await correctionService.correctText(
                "teh quick brown fox",
                new AbortController().signal,
            );

            // Reset the mock to clear previous calls
            vi.resetAllMocks();

            // Act
            await correctionService.invalidateAll();

            // Assert
            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    $type: "CorrectionBlockChangedCommand",
                    change: "remove",
                }),
            );
        });
    });

    describe("processing text differences", () => {
        it("should handle text additions correctly", async () => {
            // Arrange
            const initialText = "This is a test";
            const updatedText = "This is a test with more words";
            const signal = new AbortController().signal;

            // First correct the initial text
            (
                mockCorrectionFetcher.fetchBlocks as ReturnType<typeof vi.fn>
            ).mockResolvedValueOnce([]);
            await correctionService.correctText(initialText, signal);

            // Reset mocks to track new calls
            vi.resetAllMocks();

            // Setup fetch mock for the updated text
            (
                mockCorrectionFetcher.fetchBlocks as ReturnType<typeof vi.fn>
            ).mockResolvedValueOnce([sampleBlock]);

            // Act - correct the updated text
            await correctionService.correctText(updatedText, signal);

            // Assert
            // Should have fetched corrections only for the added part
            expect(mockCorrectionFetcher.fetchBlocks).toHaveBeenCalledWith(
                expect.stringContaining("with more words"),
                expect.any(AbortSignal),
            );
        });

        it("should handle text removals correctly", async () => {
            // Arrange
            const initialText = "This is a longer test with many words";
            const updatedText = "This is a test";
            const signal = new AbortController().signal;

            // First correct the initial text
            (
                mockCorrectionFetcher.fetchBlocks as ReturnType<typeof vi.fn>
            ).mockResolvedValueOnce([
                {
                    ...sampleBlock,
                    original: "longer",
                    offset: 10,
                    length: 6,
                },
            ]);
            await correctionService.correctText(initialText, signal);

            // Reset mocks
            vi.resetAllMocks();

            // Setup new fetch mock for updated text
            (
                mockCorrectionFetcher.fetchBlocks as ReturnType<typeof vi.fn>
            ).mockResolvedValueOnce([]);

            // Act - correct the updated shorter text
            await correctionService.correctText(updatedText, signal);

            // Assert - should have removed blocks from the removed text section
            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    $type: "CorrectionBlockChangedCommand",
                    change: "remove",
                }),
            );
        });
    });
});
