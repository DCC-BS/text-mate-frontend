export default defineI18nConfig(() => ({
    legacy: false,
    availableLocales: ["en", "de"],
    locale: "de",
    messages: {
        en: {
            navigation: {
                languages: "Languages",
                undo: "Undo",
                redo: "Redo",
            },
            tools: {
                problems: "Problems",
                rewrite: "Rewrite",
                advisor: "Feedback",
            },
            status: {
                rewritingText: "Rewriting text...",
                correctingText: "Correcting text...",
                advice: "giving advice...",
                ready: "Ready",
            },
            problems: {
                title: "Problems",
                noProblems: "No problems found",
            },
            editor: {
                rewrite: "Rewrite",
                simplify: "Simplify",
                shorten: "Shorten",
                bullet_points: "Bullet Points",
                summarize: "Summarize",
                social_mediafy: "Social Media Format",
            },
            rewrite: {
                formality: {
                    neutral: "Neutral",
                    formal: "Formal",
                    informal: "Informal",
                },
                domain: {
                    general: "General",
                    report: "Report",
                    email: "Email",
                    socialMedia: "Social Media",
                    technical: "Technical",
                },
                formalityLabel: "Formality",
                domainLabel: "Domain",
                apply: "Apply",
                noRewrite: 'Selecte text and click "Rewrite" to rewrite it',
            },
            advisor: {
                giveAdvice: "Give Advice",
                coherenceAndStructure: "Coherence and Structure",
                domainScore: "Domain Score",
                formalityScore: "Formality Score",
                comingSoon: {
                    title: "Coming Soon",
                    description:
                        "The text advisor feature is currently in development and will be available soon.",
                },
            },
        },

        de: {
            navigation: {
                languages: "Sprachen",
                undo: "Rückgängig",
                redo: "Wiederholen",
            },
            tools: {
                problems: "Probleme",
                rewrite: "Umschreiben",
                advisor: "Feedback",
            },
            status: {
                rewritingText: "Text wird umgeschrieben...",
                correctingText: "Text wird korrigiert...",
                advice: "Ratschlag geben...",
                ready: "Bereit",
            },
            problems: {
                title: "Probleme",
                noProblems: "Keine Probleme gefunden",
            },
            editor: {
                rewrite: "Umschreiben",
                simplify: "Vereinfachen",
                shorten: "Kürzen",
                bullet_points: "Aufzählungspunkte",
                summarize: "Zusammenfassen",
                social_mediafy: "Social-Media-Format",
            },
            rewrite: {
                formality: {
                    neutral: "Neutral",
                    formal: "Formal",
                    informal: "Informal",
                },
                domain: {
                    general: "Allgemein",
                    report: "Bericht",
                    email: "E-Mail",
                    socialMedia: "Soziale Medien",
                    technical: "Technisch",
                },
                formalityLabel: "Formalität",
                domainLabel: "Domäne",
                apply: "Anwenden",
                noRewrite:
                    'Text auswählen und auf "Umschreiben" klicken, um ihn umzuschreiben',
            },
            advisor: {
                giveAdvice: "Ratschlag geben",
                coherenceAndStructure: "Kohärenz und Struktur",
                domainScore: "Domänenscore",
                formalityScore: "Formalitätsscore",
                comingSoon: {
                    title: "Demnächst verfügbar",
                    description:
                        "Die Textberatungsfunktion befindet sich derzeit in der Entwicklung und wird in Kürze verfügbar sein.",
                },
            },
        },
    },
}));
