import { fileURLToPath } from "node:url";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2024-11-01",
    devtools: { enabled: true },
    extends: [
        ["github:DCC-BS/nuxt-layers/auth", { install: true }],
        ["github:DCC-BS/nuxt-layers/backend_communication", { install: true }],
        ["github:DCC-BS/nuxt-layers/health_check", { install: true }],
        ["github:DCC-BS/nuxt-layers/feedback-control", { install: true }],
        ["github:DCC-BS/nuxt-layers/logger"],
    ],
    routeRules: {
        "/api/ping": {
            cors: true,
            headers: {
                "Cache-Control": "no-store",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers":
                    "Origin, Content-Type, Accept, Authorization, X-Requested-With",
                "Access-Control-Allow-Credentials": "true",
            },
        },
    },
    alias: {
        "#shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
    app: {
        head: {
            titleTemplate: "TextMate",
            htmlAttrs: {
                lang: "de",
            },
            link: [
                {
                    rel: "icon",
                    type: "image/png",
                    href: "/favicon-96x96.png",
                    sizes: "96x96",
                },
                { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
                { rel: "shortcut icon", href: "/favicon.ico" },
                {
                    rel: "apple-touch-icon",
                    sizes: "180x180",
                    href: "/apple-touch-icon.png",
                },
                { rel: "manifest", href: "/manifest.json" },
            ],
            meta: [
                { charset: "utf-8" },
                {
                    name: "viewport",
                    content: "width=device-width, initial-scale=1",
                },
                {
                    name: "apple-mobile-web-app-title",
                    content: "TextMate",
                },
                {
                    name: "application-name",
                    content: "TextMate",
                },
                { name: "msapplication-config", content: "/browserconfig.xml" },
            ],
        },
    },
    ui: {
        colorMode: false, // Disable color mode as it is not used
    },
    modules: [
        "@nuxt/ui",
        "@nuxtjs/i18n",
        "@nuxtjs/mdc",
        "@dcc-bs/common-ui.bs.js",
        "@dcc-bs/event-system.bs.js",
        "@dcc-bs/dependency-injection.bs.js",
        "nuxt-viewport",
        "@pinia/nuxt",
        "nuxt-tour",
        "@nuxt/eslint",
    ],
    typescript: {
        typeCheck: true,
        strict: true,
    },
    css: ["~/assets/css/main.css"],
    vite: {
        build: {
            sourcemap: process.env.NODE_ENV !== "production",
            cssMinify: "lightningcss",
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
        optimizeDeps: {
            include: ["vue-pdf-embed"],
            exclude: ["@vueuse/core"],
        },
    },
    runtimeConfig: {
        githubToken: process.env.GITHUB_TOKEN,
        apiUrl: process.env.API_URL,
        feedback: {
            githubToken: process.env.FEEDBACK_GITHUB_TOKEN,
            project: "text-mate",
            repoOwner: "DCC-BS",
            repo: "Feedback",
        },
        public: {
            useDummyData: process.env.DUMMY,
            logger: {
                loglevel: process.env.LOG_LEVEL || "debug",
            },
        },
    },
    fonts: {
        providers: {
            bunny: false,
        },
    },
    // localization
    i18n: {
        locales: [
            {
                code: "en",
                name: "English",
                file: "en.json",
            },
            {
                code: "de",
                name: "Deutsch",
                file: "de.json",
            },
        ],
        defaultLocale: "de",
        strategy: "no_prefix",
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
        devtools: {
            enabled: true,
        },
        sourcemap: {
            server: false,
            client: true,
        },
    },
});
