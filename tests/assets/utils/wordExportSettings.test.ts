import { DEFAULT_WORD_EXPORT_SETTINGS, parseWordExportSettings, wordExportFilename, wordExportSettingsSchema } from "../../../app/utils/wordExportSettings";

// Exercise malformed storage and form bounds without involving the browser UI.
describe("Word export settings", function () {
    it("restores a validated profile", function () {
        const profile = { ...DEFAULT_WORD_EXPORT_SETTINGS, fontFamily: "Aptos", fontSize: 11 };
        expect(parseWordExportSettings(JSON.stringify(profile))).toEqual(profile);
    });
    it("falls back for missing, corrupt, and invalid profiles", function () {
        for (const value of [null, "invalid", "{}", JSON.stringify({ ...DEFAULT_WORD_EXPORT_SETTINGS, fontSize: -1 })]) {
            expect(parseWordExportSettings(value)).toEqual(DEFAULT_WORD_EXPORT_SETTINGS);
        }
    });
    it("rejects invalid font, size and spacing", function () {
        for (const patch of [{ fontFamily: " " }, { fontSize: 73 }, { lineSpacing: 0 }, { language: "invalid" }]) {
            expect(wordExportSettingsSchema.safeParse({ ...DEFAULT_WORD_EXPORT_SETTINGS, ...patch }).success).toBe(false);
        }
    });
    it("sanitizes filenames and preserves a single extension", function () {
        expect(wordExportFilename("Bericht.docx")).toBe("Bericht.docx");
        expect(wordExportFilename("../Bericht:2026")).toBe("..-Bericht-2026.docx");
        expect(wordExportFilename(" ")).toBe("textmate.docx");
    });
});
