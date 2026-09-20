/** Document defaults; explicit editor formatting takes precedence. */
export interface WordExportSettings {
    fontFamily: string;
    fontSize: number;
    language: "de-CH" | "en-GB";
    lineSpacing: number;
    marginPreset: "normal" | "narrow" | "wide";
}
