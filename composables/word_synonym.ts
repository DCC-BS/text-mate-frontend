import type {
    WordSynonymInput,
    WordSynonymResult,
} from "~/assets/models/word-synonym";

export function getWordSynonym(
    word: string,
    sentence: string,
): Promise<WordSynonymResult> {
    const body = {
        word: word,
        context: sentence,
    } as WordSynonymInput;

    return $fetch<WordSynonymResult>("api/word-synonym", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });
}
