import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
    content: [
        "./components/**/*.{js,vue,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./app.vue",
        './nuxt.config.{js,ts}',
        "./error.vue",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
