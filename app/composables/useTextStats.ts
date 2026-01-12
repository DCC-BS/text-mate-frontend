export function useTextStats(text: Ref<string>) {
    const wordCount = computed(() => countWords(text.value));
    const charCount = computed(() => text.value.length);
    const syllableCount = computed(() => {
        const words = text.value.split(/\s+/).filter(Boolean);
        return words.reduce((acc, word) => acc + countSyllables(word), 0);
    });

    const averageSentenceLength = computed(() =>
        calculateAverageSentenceLength(text.value),
    );
    const averageSyllablesPerWord = computed(() =>
        calculateAverageSyllablesPerWord(text.value),
    );

    const fleschScore = computed(() => calculateFleschScore(text.value));

    return {
        wordCount,
        charCount,
        syllableCount,
        averageSentenceLength,
        averageSyllablesPerWord,
        fleschScore,
    };
}
