// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2024-11-01",
    devtools: { enabled: false },
    app: {
        head: {
            titleTemplate: "Text Mate",
            htmlAttrs: {
                lang: "de",
            },
            meta: [
                { charset: "utf-8" },
                {
                    name: "viewport",
                    content: "width=device-width, initial-scale=1",
                },
                {
                    name: "apple-mobile-web-app-title",
                    content: "Text Mate",
                },
                {
                    name: "application-name",
                    content: "Text Mate",
                },
                { name: "msapplication-config", content: "/browserconfig.xml" },
            ],
        },
    },
    ui: {
        colorMode: false,
    },
    modules: [
        "@nuxt/ui",
        "@nuxtjs/i18n",
        "@vite-pwa/nuxt",
        "@nuxtjs/mdc",
        "@dcc-bs/event-system.bs.js",
        "@dcc-bs/common-ui.bs.js",
        "nuxt-viewport",
    ],
    typescript: {
        strict: true,
    },
    css: ["~/assets/css/main.css"],
    runtimeConfig: {
        public: {
            apiUrl: process.env.API_URL,
        },
    },
    // localization
    i18n: {
        bundle: {
            optimizeTranslationDirective: false,
        },
        locales: ["en", "de"],
        defaultLocale: "de",
        vueI18n: "./i18n.config.ts",
        lazy: true,
    },
    nitro: {
        node: true,
        prerender: {
            routes: ["/"],
        },
    },
    pwa: {
        registerType: "autoUpdate",
        workbox: {
            globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,svg}"],
            globIgnores: ["dev-sw-dist/**/*"],
            navigateFallback: "/",
        },
        client: {
            periodicSyncForUpdates: 60 * 10, // 10 minutes
        },
        manifest: {
            name: "Text Mate",
            short_name: "Text Mate",
            description: "Tool for text manipulation",
            theme_color: "#000000",
            background_color: "#000000",
            icons: [
                {
                    src: "/HeroiconsLanguage.png",
                    sizes: "512x512",
                },
            ],

            shortcuts: [
                {
                    name: "From Clipboard",
                    url: "/?clipboard=true",
                    icons: [
                        {
                            src: "/MaterialSymbolsContentPasteGo.png",
                            sizes: "512x512",
                        },
                    ],
                },
            ],
        },
    },
    viewport: {
        breakpoints: {
            xs: 320,
            sm: 640,
            md: 768,
            lg: 1024,
            xl: 1280,
            "2xl": 1536,
        },
        defaultBreakpoints: {
            desktop: "lg",
            mobile: "xs",
            tablet: "md",
        },

        fallbackBreakpoint: "lg",
    },
    $development: {
        pwa: {
            devOptions: {
                enabled: false,
            },
        },
        devtools: { enabled: true },
    },
});
