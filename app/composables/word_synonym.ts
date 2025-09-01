import type {
    WordSynonymInput,
    WordSynonymResult,
} from "~/assets/models/word-synonym";

export async function getWordSynonym(
    word: string,
    sentence: string,
): Promise<WordSynonymResult> {
    const body = {
        word: word,
        context: sentence,
    } as WordSynonymInput;

    const response = await apiFetch<WordSynonymResult>("api/word-synonym", {
        method: "POST",
        body: body,
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (isApiError(response)) {
        throw response;
    }

    return response;
}
