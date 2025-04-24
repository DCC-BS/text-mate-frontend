import { match } from "ts-pattern";

export function isAlphanumeric(char: string): boolean {
    const code = char.charCodeAt(0);
    return (
        (code >= 48 && code <= 57) || // 0-9
        (code >= 65 && code <= 90) || // A-Z
        (code >= 97 && code <= 122) // a-z
    );
}

export function isWhiteSpace(char: string): boolean {
    const code = char.charCodeAt(0);
    return (
        code === 9 || // Tab
        code === 10 || // Line feed
        code === 11 || // Vertical tab
        code === 12 || // Form feed
        code === 13 || // Carriage return
        code === 32 // Space
    );
}

export function isSentenceEnd(char: string): boolean {
    const code = char.charCodeAt(0);

    return (
        code === 33 || // Exclamation mark
        code === 63 || // Question mark
        code === 10 || // newline
        code === 46 // Full stop
    );
}

function isQuote(char: string): boolean {
    // Check for various quotation marks from different languages and writing systems
    return [
        '"', // Double quote
        "'", // Single quote
        "`", // Backtick
        "«", // Left-pointing double angle quotation mark
        "»", // Right-pointing double angle quotation mark
        "„", // Double low-9 quotation mark (German)
        "‟", // Double high-reversed-9 quotation mark
        "‹", // Single left-pointing angle quotation mark
        "›", // Single right-pointing angle quotation mark
        "「", // Left corner bracket (CJK)
        "」", // Right corner bracket (CJK)
        "『", // Left white corner bracket (CJK)
        "』", // Right white corner bracket (CJK)
        "【", // Left black lenticular bracket (CJK)
        "】", // Right black lenticular bracket (CJK)
        "《", // Left double angle bracket (CJK)
        "》", // Right double angle bracket (CJK)
        "〈", // Left angle bracket
        "〉", // Right angle bracket
        "（", // Fullwidth left parenthesis
        "）", // Fullwidth right parenthesis
    ].includes(char);
}

function getClosionQuote(char: string | undefined): string {
    return match(char)
        .with('"', () => '"')
        .with("'", () => "'")
        .with("`", () => "`")
        .with("«", () => "»")
        .with("“", () => "”")
        .with("‘", () => "’")
        .with("『", () => "』")
        .with("【", () => "】")
        .with("（", () => "）")
        .with("《", () => "》")
        .with("「", () => "」")
        .with("„", () => "“")
        .with("«", () => "»")
        .with("»", () => "«")
        .with("›", () => "‹")
        .with("‹", () => "›")
        .otherwise(() => "");
}

// Common abbreviations that are not sentence boundaries when followed by a period
const commonAbbreviations = [
    // English abbreviations
    "dr.",
    "mr.",
    "mrs.",
    "ms,",
    "prof,",
    "sen.",
    "rep.",
    "rev.",
    "gen.",
    "m.",
    "mme.",
    "mlle.",
    "st.",
    "sr.",
    "jr.",
    "ph.d.",
    "etc.",
    "usw.",
    "a.m",
    "p.m",
    "e.g.",
    "i.e",
    "vs",
    "a.k.a",

    // French abbreviations
    "vol.",
    "ch.",
    "art.",
    "av.",
    "bd.",
    "mgr.",
    "dir.",
    "mme.",
    "mlle.",
    "p.",
    "pp.",
    "tel.",
    "r.",
    "n°.",
    "n°s.",
    "c.-à-d.",

    // German abbreviations
    "abs.",
    "abt.",
    "allg.",
    "bzw.",
    "ca.",
    "d.h.",
    "evtl.",
    "ggf.",
    "hrsg.",
    "inkl.",
    "max.",
    "min.",
    "nr.",
    "o.ä.",
    "prof.",
    "s.",
    "sog.",
    "str.",
    "u.a.",
    "u.ä.",
    "usw.",
    "vgl.",
    "z.b.",
];

/**
 * Split text into sentences
 * This implementation handles various edge cases including:
 * - Abbreviations (Dr., Mr., etc.)
 * - URLs and email addresses (www.example.com, user@example.com)
 * - Quotes and embedded sentences
 * - Sentences without spaces after punctuation
 * - Newlines as sentence boundaries
 * - Special cases for colons and semicolons
 */
export function* splitToSentences(text: string): Generator<string> {
    // Handle empty text
    if (text.length === 0) {
        return;
    }

    const input = `${text} `;
    const quoteStack = [] as string[];
    let sentenceStart = 0;

    for (let i = 0; i < text.length; i++) {
        const prev = input.at(i - 1);
        const current = input[i];
        const next = input[i + 1];

        if (isQuote(current)) {
            if (
                quoteStack.length > 0 &&
                getClosionQuote(quoteStack.at(-1)) === current
            ) {
                quoteStack.pop();
            } else if (!prev || isWhiteSpace(prev)) {
                quoteStack.push(current);
            }
        }

        if (quoteStack.length > 0) {
            // Inside quotes, skip sentence end checks
            continue;
        }

        const isAbbr = isAbbreviation(input, i);
        if (isAbbr > 0) {
            i = isAbbr; // Skip the abbreviation
            continue;
        }

        if (isDecimalPoint(input, i)) {
            continue; // Skip decimal points
        }

        const urlEnd = isUrl(input, i);
        if (urlEnd > 0) {
            i = urlEnd; // Skip the URL
            continue;
        }

        const emailEnd = isEmail(input, i);
        if (emailEnd > 0) {
            i = emailEnd; // Skip the email
            continue;
        }

        if (isSentenceEnd(current) && !isSentenceEnd(next)) {
            yield text.substring(sentenceStart, i + 1);
            sentenceStart = i + 1;
        }
    }

    // Handle the last sentence
    if (sentenceStart < text.length) {
        yield text.substring(sentenceStart, input.length - 1);
    }
}

/**
 * Check if the period at the given position is part of an abbreviation
 */
function isAbbreviation(text: string, position: number): number {
    if (position > 0 && !isWhiteSpace(text[position - 1])) return -1;

    let end = position + 1;
    while (end < text.length && !isWhiteSpace(text[end])) {
        end++;
    }

    const word = text
        .substring(position, end + 1)
        .trim()
        .toLocaleLowerCase();

    // Check against known abbreviations
    if (commonAbbreviations.includes(word)) {
        return end - 1;
    }

    if (word.endsWith(".") && commonAbbreviations.includes(word.slice(0, -1))) {
        return end - 2;
    }

    // Check for initials pattern (single letter followed by period)
    if (isSingleLetterWithPeriod(text, position)) {
        let nextPos = position + 2;

        while (
            (nextPos < text.length && isWhiteSpace(text[nextPos])) ||
            isSingleLetterWithPeriod(text, nextPos)
        ) {
            if (isWhiteSpace(text[nextPos])) {
                nextPos++;
            } else {
                nextPos += 2;
            }
        }

        return nextPos - 1; // Return the position of the last period
    }

    return -1;
}

function isSingleLetterWithPeriod(text: string, position: number): boolean {
    return (
        position > 0 &&
        text[position + 1] === "." &&
        isUpperCase(text[position])
    );
}

/**
 * Check if the period at the given position is a decimal point in a number
 */
function isDecimalPoint(text: string, position: number): boolean {
    if (text[position] !== ".") return false;

    // Check for digit.digit pattern
    return (
        position > 0 &&
        position < text.length - 1 &&
        isDigit(text[position - 1]) &&
        isDigit(text[position + 1])
    );
}

/**
 * Check if the position is within a URL by only scanning forward
 * @param text The text to check
 * @param position The position to check
 * @returns The index to skip to if part of a URL, or -1 otherwise
 */
function isUrl(text: string, position: number): number {
    // Maximum characters to look ahead
    const maxLookAhead = 100;

    // Find potential URL end
    let urlEnd = position;

    // Check if we're at a valid URL prefix position
    const isPotentialUrlStart =
        // Check for http:// or https://
        (position + 7 <= text.length &&
            text.slice(position, position + 7).toLowerCase() === "http://") ||
        (position + 8 <= text.length &&
            text.slice(position, position + 8).toLowerCase() === "https://") ||
        // Check for www.
        (position + 4 <= text.length &&
            text.slice(position, position + 4).toLowerCase() === "www.");

    // If not at the start of a URL or potentially in a URL, return early
    if (!isPotentialUrlStart) {
        return -1;
    }

    // Find end of the potential URL by scanning forward
    for (let i = 0; i < maxLookAhead && position + i < text.length; i++) {
        const idx = position + i;

        if (
            isWhiteSpace(text[idx]) ||
            text[idx] === "," ||
            text[idx] === ";" ||
            text[idx] === ")" ||
            text[idx] === "]" ||
            text[idx] === "}" ||
            text[idx] === '"' ||
            text[idx] === "'" ||
            text[idx] === ">" ||
            text[idx] === "\n"
        ) {
            urlEnd = idx - 1;
            break;
        }
        urlEnd = idx;
    }

    if (text.at(urlEnd) === ".") {
        urlEnd--;
    }

    return urlEnd;
}

/**
 * Check if the position is within an email address
 * @param text The text to check
 * @param position The position to check
 * @returns The index to skip to if part of an email, or -1 otherwise
 */
function isEmail(text: string, position: number): number {
    // Skip the early check for period to allow detection anywhere in email

    // Constants for scanning limits
    const maxLookAhead = 100; // Maximum characters to look ahead

    let end = position;
    for (let i = 0; i < maxLookAhead && position + i < text.length; i++) {
        if (
            isWhiteSpace(text[position + i]) ||
            text[position + i] === "," ||
            text[position + i] === ";" ||
            text[position + i] === ")" ||
            text[position + i] === "]" ||
            text[position + i] === "}" ||
            text[position + i] === '"' ||
            text[position + i] === "'" ||
            text[position + i] === ">" ||
            text[position + i] === "\n"
        ) {
            end = position + i - 1;
            break;
        }
    }

    let substring = text.substring(position, end + 1); // Extract the potential email

    if (!substring.includes("@")) {
        return -1; // Not a valid email
    }

    if (substring.endsWith(".")) {
        end--; // Remove trailing period if present
        substring = substring.slice(0, -1); // Update the substring
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValidEmail = emailRegex.test(substring);
    if (isValidEmail) {
        // Check if the email ends with a period
        if (text.at(end) === ".") {
            end--;
        }
        return end; // Return the index of the last character of the email
    }

    return -1; // Not a valid email
}

/**
 * Check if a character is uppercase
 */
function isUpperCase(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 65 && code <= 90; // A-Z
}

/**
 * Check if a character is a digit
 */
function isDigit(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 48 && code <= 57; // 0-9
}
