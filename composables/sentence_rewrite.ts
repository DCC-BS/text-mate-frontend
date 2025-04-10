import type {
    SentenceRewriteInput,
    SentenceRewriteResult,
} from "~/assets/models/sentence-rewrite";

export function getAlternativeSentences(
    sentence: string,
    context: string,
): Promise<SentenceRewriteResult> {
    const body = {
        sentence,
        context,
    } as SentenceRewriteInput;

    return $fetch<SentenceRewriteResult>("/api/sentence-rewrite", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });
}
