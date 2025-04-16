import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import Vue from "@vitejs/plugin-vue";

/**
 * Vitest configuration for testing Nuxt components and utilities
 */
export default defineConfig({
    plugins: [Vue()],
    test: {
        globals: true,
        environment: "happy-dom",
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: ["node_modules/", ".nuxt/", "tests/"],
        },
        root: fileURLToPath(new URL("./", import.meta.url)),
        include: ["**/*.test.ts", "**/*.spec.ts"],
    },
    resolve: {
        alias: {
            "~": fileURLToPath(new URL("./", import.meta.url)),
            "@": fileURLToPath(new URL("./", import.meta.url)),
            "#app": fileURLToPath(
                new URL("./node_modules/nuxt/dist/app", import.meta.url),
            ),
        },
    },
});
