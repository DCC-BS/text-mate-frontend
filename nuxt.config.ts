import { visualizer } from "rollup-plugin-visualizer";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2024-11-01",
    devtools: { enabled: true },
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
                    content: "width-device-width, initial-scale=1",
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
        "@dcc-bs/logger.bs.js",
        "@dcc-bs/feedback-control.bs.js",
        "@dcc-bs/dependency-injection.bs.js",
        "nuxt-viewport",
        "@pinia/nuxt",
    ],
    "feedback-control.bs.js": {
        repo: "Feedback",
        owner: "DCC-BS",
        project: "text-mate",
        githubToken: process.env.GITHUB_TOKEN,
    },
    typescript: {
        strict: true,
    },
    css: ["~/assets/css/main.css"],
    vite: {
        plugins: [
            visualizer({
                filename: "stats.html",
                gzipSize: true,
                brotliSize: true,
                open: true,
                template: "treemap",
            }),
        ],
        build: {
            // Disable sourcemaps in production to avoid warnings
            sourcemap: process.env.NODE_ENV !== "production",
            cssMinify: "lightningcss",
            // Fix the chunk size warning by setting a higher limit
            chunkSizeWarningLimit: 800,
            rollupOptions: {
                output: {
                    // Use manual chunks to improve chunking
                    manualChunks: {
                        "vue-vendor": ["vue", "vue-router"],
                        "tiptap-vendor": [
                            "@tiptap/vue-3",
                            "@tiptap/starter-kit",
                            "@tiptap/extension-bubble-menu",
                            "@tiptap/extension-character-count",
                        ],
                        "pdf-vendor": ["vue-pdf-embed"],
                    },
                },
            },
        },
        // Add optimizations for vue-pdf-embed
        optimizeDeps: {
            include: ["vue-pdf-embed"],
        },
    },
    runtimeConfig: {
        githubToken: process.env.GITHUB_TOKEN,
        public: {
            apiUrl: process.env.API_URL,
            logger_bs: {
                loglevel: process.env.LOG_LEVEL || "debug",
            },
        },
    },
    // localization
    i18n: {
        bundle: {
            optimizeTranslationDirective: false,
        },
        locales: [
            {
                code: "en",
                name: "English",
            },
            {
                code: "de",
                name: "Deutsch",
            },
        ],
        defaultLocale: "de",
        vueI18n: "./i18n.config.ts",
        lazy: true,
        strategy: "prefix_except_default",
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
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
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
        debug: true,
        pwa: {
            devOptions: {
                enabled: false,
            },
        },
        devtools: {
            enabled: true,
        },
        "logger.bs.js": {
            loglevel: "debug",
        },
        sourcemap: {
            server: true,
            client: true,
        },
    },
});
