export function calculateAverageSentenceLength(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const totalWords = sentences.reduce(
        (acc, sentence) => acc + sentence.split(/\s+/).length,
        0,
    );

    return round(totalWords / sentences.length || 0);
}

export function calculateAverageSyllablesPerWord(text: string): number {
    const words = text.split(/\s+/).filter(Boolean);
    const totalSyllables = words.reduce(
        (acc, word) => acc + countSyllables(word),
        0,
    );
    return round(totalSyllables / words.length || 0);
}

export function countWords(text: string): number {
    // Split the text by whitespace and filter out empty strings
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    return words.length;
}

export function countSyllables(word: string): number {
    // Define vowels for German, including umlauts
    const vowels = "aeiouyäöü";
    // Normalize input
    const wordLower = word.toLowerCase().trim();

    // Edge case: empty string
    if (wordLower.length === 0) return 0;

    let count = 0;
    let prevCharWasVowel = false;

    for (let i = 0; i < wordLower.length; i++) {
        const char = wordLower[i] ?? "";
        if (vowels.includes(char)) {
            // Only count the start of a new vowel group
            if (!prevCharWasVowel) {
                count++;
                prevCharWasVowel = true;
            }
        } else {
            prevCharWasVowel = false;
        }
    }

    // Optional: handle silent 'e' at the end (more common in English, rare in German)
    if (wordLower.endsWith("e") && count > 1) count--;

    // Ensure at least one syllable
    if (count === 0) count = 1;

    return count;
}

/**
 *
 * C\alculates the Flesch Reading Ease score for a given text.
 * The score is a number between 0 and 100, where higher scores indicate easier readability.
 * 90–100	Very easy
 * 80–90	Easy
 * 70–80	Fairly easy
 * 60–70	Standard
 * 50–60	Fairly difficult
 * 30–50	Difficult
 *  0–30	Very confusing/academic
 * @param text - The input text to analyze.
 * @returns The Flesch Reading Ease score
 **/
export function calculateFleschScore(text: string): number {
    const asl = calculateAverageSentenceLength(text); // Average Sentence Length
    const asw = calculateAverageSyllablesPerWord(text); // Average Syllables per Word
    let score = 180 - asl - 58.5 * asw;
    score = Math.max(Math.min(score, 100), 0); // Ensure the score is not negative
    return round(score); // Rounded to two decimals
}

/**
 * Rounds a number to two decimal places.
 * @param value - The number to round.
 * @returns The rounded number.
 */
function round(value: number): number {
    return Math.round(value * 100) / 100;
}
