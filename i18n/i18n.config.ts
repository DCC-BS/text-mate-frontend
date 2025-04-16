export default defineI18nConfig(() => ({
    legacy: false,
    availableLocales: ["en", "de"],
    locale: "de",
    messages: {
        en: {
            language: {
                auto: "Detect Language",
                "de-CH": "German",
                fr: "French",
                it: "Italian",
                "en-US": "English (US)",
                "en-GB": "English (UK)",
            },
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
                writing_style: {
                    general: "General",
                    simple: "Simple",
                    professional: "Professional",
                    casual: "Casual",
                    academic: "Academic",
                    technical: "Technical",
                },
                target_audience: {
                    general: "General",
                    young: "Young Adults",
                    adult: "Adults",
                    children: "Children",
                },
                intend: {
                    general: "General",
                    persuasive: "Persuasive",
                    informative: "Informative",
                    descriptive: "Descriptive",
                    narrative: "Narrative",
                    entertaining: "Entertaining",
                },
                writingStyleLabel: "Writing Style",
                targetAudienceLabel: "Target Audience",
                intendLabel: "Intent",
                apply: "Apply",
                noRewrite: 'Select text and click "Rewrite" to rewrite it',
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
            language: {
                auto: "Sprache erkennen",
                "de-CH": "Deutsch",
                fr: "Französisch",
                it: "Italienisch",
                "en-US": "Englisch (US)",
                "en-GB": "Englisch (GB)",
            },
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
                writing_style: {
                    general: "Allgemein",
                    simple: "Einfach",
                    professional: "Professionell",
                    casual: "Locker",
                    academic: "Akademisch",
                    technical: "Technisch",
                },
                target_audience: {
                    general: "Allgemein",
                    young: "Junge Erwachsene",
                    adult: "Erwachsene",
                    children: "Kinder",
                },
                intend: {
                    general: "Allgemein",
                    persuasive: "Überzeugend",
                    informative: "Informativ",
                    descriptive: "Beschreibend",
                    narrative: "Erzählend",
                    entertaining: "Unterhaltsam",
                },
                writingStyleLabel: "Schreibstil",
                targetAudienceLabel: "Zielgruppe",
                intendLabel: "Absicht",
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

        fr: {
            language: {
                auto: "Détecter la langue",
                "de-CH": "Allemand",
                fr: "Français",
                it: "Italien",
                "en-US": "Anglais (US)",
                "en-GB": "Anglais (GB)",
            },
            navigation: {
                languages: "Langues",
                undo: "Annuler",
                redo: "Rétablir",
            },
            tools: {
                problems: "Problèmes",
                rewrite: "Réécrire",
                advisor: "Conseils",
            },
            status: {
                rewritingText: "Réécriture du texte...",
                correctingText: "Correction du texte...",
                advice: "Donner des conseils...",
                ready: "Prêt",
            },
            problems: {
                title: "Problèmes",
                noProblems: "Aucun problème trouvé",
            },
        },

        it: {
            language: {
                auto: "Rileva lingua",
                "de-CH": "Tedesco",
                fr: "Francese",
                it: "Italiano",
                "en-US": "Inglese (US)",
                "en-GB": "Inglese (GB)",
            },
            navigation: {
                languages: "Lingue",
                undo: "Annulla",
                redo: "Ripeti",
            },
            tools: {
                problems: "Problemi",
                rewrite: "Riscrivere",
                advisor: "Feedback",
            },
            status: {
                rewritingText: "Riscrittura del testo...",
                correctingText: "Correzione del testo...",
                advice: "Fornire consigli...",
                ready: "Pronto",
            },
            problems: {
                title: "Problemi",
                noProblems: "Nessun problema trovato",
            },
        },
    },
}));
