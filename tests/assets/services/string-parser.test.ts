import { describe, expect, it } from "vitest";
import {
    isAlphanumeric,
    splitToSentences,
} from "../../../app/assets/services/string-parser";

/**
 * Tests for the string-parser utility functions
 */
describe("isAlphanumeric", () => {
    it("should return true for alphanumeric characters", () => {
        // Test numeric characters
        expect(isAlphanumeric("0")).toBe(true);
        expect(isAlphanumeric("5")).toBe(true);
        expect(isAlphanumeric("9")).toBe(true);

        // Test uppercase letters
        expect(isAlphanumeric("A")).toBe(true);
        expect(isAlphanumeric("M")).toBe(true);
        expect(isAlphanumeric("Z")).toBe(true);

        // Test lowercase letters
        expect(isAlphanumeric("a")).toBe(true);
        expect(isAlphanumeric("m")).toBe(true);
        expect(isAlphanumeric("z")).toBe(true);
    });

    it("should return false for non-alphanumeric characters", () => {
        // Test punctuation
        expect(isAlphanumeric(".")).toBe(false);
        expect(isAlphanumeric(",")).toBe(false);
        expect(isAlphanumeric("!")).toBe(false);
        expect(isAlphanumeric("?")).toBe(false);

        // Test whitespace
        expect(isAlphanumeric(" ")).toBe(false);
        expect(isAlphanumeric("\t")).toBe(false);
        expect(isAlphanumeric("\n")).toBe(false);

        // Test symbols
        expect(isAlphanumeric("@")).toBe(false);
        expect(isAlphanumeric("#")).toBe(false);
        expect(isAlphanumeric("$")).toBe(false);
    });

    it("should handle only the first character of multi-character strings", () => {
        expect(isAlphanumeric("abc")).toBe(true); // Only checks 'a'
        expect(isAlphanumeric("123")).toBe(true); // Only checks '1'
        expect(isAlphanumeric(".abc")).toBe(false); // Only checks '.'
    });
});

describe("splitToSentences", () => {
    it("should split text into sentences at non-alphanumeric to alphanumeric boundaries", () => {
        const text = "Hello, world! How are you?";
        const sentences = Array.from(splitToSentences(text));

        expect(sentences).toEqual(["Hello, world!", " How are you?"]);
    });

    it("should handle empty strings", () => {
        const sentences = Array.from(splitToSentences(""));
        expect(sentences).toEqual([]);
    });

    it("should handle strings with only alphanumeric characters", () => {
        const text = "HelloWorld123";
        const sentences = Array.from(splitToSentences(text));
        expect(sentences).toEqual(["HelloWorld123"]);
    });

    it("should handle complex text patterns correctly", () => {
        const text =
            "This is a test. It has multiple sentences, with various punctuation! Does it work?";
        const sentences = Array.from(splitToSentences(text));

        expect(sentences).toEqual([
            "This is a test.",
            " It has multiple sentences, with various punctuation!",
            " Does it work?",
        ]);
    });

    it("should handle numeric text correctly", () => {
        const text = "Chapter 1: Introduction. Section 2.3 begins on page 42.";
        const sentences = Array.from(splitToSentences(text));

        expect(sentences).toEqual([
            "Chapter 1: Introduction.",
            " Section 2.3 begins on page 42.",
        ]);
    });

    /**
     * English language tests
     */
    describe("English language", () => {
        it("should handle abbreviations and titles properly", () => {
            const text =
                "Dr. Smith went to Washington. He met with Sen. Brown at 3 p.m. They discussed the issue.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "Dr. Smith went to Washington.",
                " He met with Sen. Brown at 3 p.m.",
                " They discussed the issue.",
            ]);
        });

        it("should handle ellipses and multiple punctuation", () => {
            const text = 'She hesitated... Then she said, "I don\'t know."';
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "She hesitated...",
                ' Then she said, "I don\'t know."',
            ]);
        });

        it("should handle initials and names", () => {
            const text =
                "The author is J. R. R. Tolkien. His books are famous.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "The author is J. R. R. Tolkien.",
                " His books are famous.",
            ]);
        });

        it("should handle quotes and embedded sentences", () => {
            const text = '"Are you coming?" she asked. "Yes," he replied.';
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                '"Are you coming?" she asked.',
                ' "Yes," he replied.',
            ]);
        });
    });

    /**
     * German language tests
     */
    describe("German language", () => {
        it.each([
            [
                "Das Treffen war um 13.00 Uhr. Herr Dr. Müller kam später.",
                [
                    "Das Treffen war um 13.00 Uhr.",
                    " Herr Dr. Müller kam später.",
                ],
            ],
            [
                "Das bedeutet d.h. nichts anderes. Zum Beispiel z.B. hier.",
                [
                    "Das bedeutet d.h. nichts anderes.",
                    " Zum Beispiel z.B. hier.",
                ],
            ],
            [
                "Vgl. die Studie von Prof. Dr. Schmidt et al. Sie zeigt u.a. wichtige Erkenntnisse.",
                [
                    "Vgl. die Studie von Prof. Dr. Schmidt et al.",
                    " Sie zeigt u.a. wichtige Erkenntnisse.",
                ],
            ],
            [
                "Die GmbH & Co. KG wurde gegründet. Der CEO bzw. Geschäftsführer ist anwesend.",
                [
                    "Die GmbH & Co. KG wurde gegründet.",
                    " Der CEO bzw. Geschäftsführer ist anwesend.",
                ],
            ],
            [
                "Das Meeting ist ca. 2 Std. lang. Es beginnt um 14.30 Uhr bzw. 2.30 PM.",
                [
                    "Das Meeting ist ca. 2 Std. lang.",
                    " Es beginnt um 14.30 Uhr bzw. 2.30 PM.",
                ],
            ],
            [
                "Gem. § 15 Abs. 2 BGB ist das möglich. Siehe auch Art. 3 GG bzgl. der Regelung.",
                [
                    "Gem. § 15 Abs. 2 BGB ist das möglich.",
                    " Siehe auch Art. 3 GG bzgl. der Regelung.",
                ],
            ],
            ["Wir treffen uns morgen usw.", ["Wir treffen uns morgen usw."]],
        ])(
            "should handle German abbreviations for %s",
            (text: string, expected: string[]) => {
                const sentences = Array.from(splitToSentences(text));
                expect(sentences).toEqual(expected);
            },
        );

        it("should handle mixed abbreviations in complex sentences", () => {
            const text =
                "Die Firma Max Mustermann GmbH i.G. wurde am 15.03.2023 gegründet. Der Gründer, Hr. Mustermann, ist ca. 45 J. alt.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "Die Firma Max Mustermann GmbH i.G. wurde am 15.03.2023 gegründet.",
                " Der Gründer, Hr. Mustermann, ist ca. 45 J. alt.",
            ]);
        });

        it("should handle freestanding lines without punctuation", () => {
            const text =
                "Sehr geehrte Damen und Herren\nIch schreibe Ihnen bezüglich...";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "Sehr geehrte Damen und Herren\n",
                "Ich schreibe Ihnen bezüglich...",
            ]);
        });

        it("should handle complex sentences with subordinate clauses", () => {
            const text = "Ob ich das hinkriege weiß ich nicht.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual(["Ob ich das hinkriege weiß ich nicht."]);
        });

        it("should handle elliptical or fragmented sentences", () => {
            const text = "Mit siebzig hat sie das Kind bekommen oder so.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "Mit siebzig hat sie das Kind bekommen oder so.",
            ]);
        });
    });

    /**
     * French language tests
     */
    describe("French language", () => {
        it("should handle French abbreviations and titles", () => {
            const text =
                "M. Dupont est arrivé à 18 h. Il a dit bonjour à Mme. Martin.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "M. Dupont est arrivé à 18 h.",
                " Il a dit bonjour à Mme. Martin.",
            ]);
        });

        it("should handle embedded clauses and coordinating conjunctions", () => {
            const text = "La voiture démarre et part en vitesse.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "La voiture démarre et part en vitesse.",
            ]);
        });

        it("should handle relative clauses", () => {
            const text = "Le vin qu'il boit le soir est très fort.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "Le vin qu'il boit le soir est très fort.",
            ]);
        });

        it("should handle quotation and dialogue in French style", () => {
            const text =
                "« Où vas-tu ? » demanda-t-elle. « Je reviens tout de suite. »";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "« Où vas-tu ? » demanda-t-elle.",
                " « Je reviens tout de suite. »",
            ]);
        });

        it("should handle text without punctuation at end", () => {
            const text =
                "Bonjour madame\nJe vous écris au sujet de votre annonce";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "Bonjour madame\n",
                "Je vous écris au sujet de votre annonce",
            ]);
        });
    });

    /**
     * Additional edge cases for all languages
     */
    describe("Additional edge cases", () => {
        it("should handle URLs and emails", () => {
            const text =
                "Visit www.example.com. Send an email to test@example.com. http://example.com";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "Visit www.example.com.",
                " Send an email to test@example.com.",
                " http://example.com",
            ]);
        });

        it("should handle parentheses and brackets", () => {
            const text = 'He said (surprisingly): "Let\'s go."';
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual(['He said (surprisingly): "Let\'s go."']);
        });

        it("should handle decimal numbers correctly", () => {
            const text = "The price is 42.99 euros. It's a good deal.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "The price is 42.99 euros.",
                " It's a good deal.",
            ]);
        });

        it("should handle multiple consecutive sentence endings", () => {
            const text = "Really?! I didn't know that... Well, never mind.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "Really?!",
                " I didn't know that...",
                " Well, never mind.",
            ]);
        });

        it("should handle multi-line text", () => {
            const text =
                "This is line one.\nThis is line two.\nThis is line three.";
            const sentences = Array.from(splitToSentences(text));
            expect(sentences).toEqual([
                "This is line one.\n",
                "This is line two.\n",
                "This is line three.",
            ]);
        });
    });
});
