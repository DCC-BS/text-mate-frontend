import { defineConfig, devices } from "@playwright/test";

// Dedicated port so the E2E server never collides with (or silently reuses)
// a real dev server running on port 3000.
const baseURL = "http://localhost:4300";

export default defineConfig({
    testDir: "./tests/e2e",
    testMatch: "**/*.spec.ts",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    // Parallelism is safe: every test gets an isolated browser context and
    // the server is a deterministic production build.
    workers: process.env.CI ? 4 : 2,
    reporter: process.env.CI
        ? [
              ["github"],
              ["json", { outputFile: "results.json" }],
              ["html", { outputFolder: "playwright-report" }],
          ]
        : "list",
    // Generous assertion timeout: quick actions stream their result via SSE
    // and can take a few seconds, which flaked with the 5s default.
    expect: { timeout: 10_000 },
    use: {
        baseURL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        channel: "chromium",
        locale: "de-DE",
        ignoreHTTPSErrors: true,
        permissions: ["microphone", "clipboard-read", "clipboard-write"],
        launchOptions: {
            args: [
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        },
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],

    webServer: {
        // The server entrypoint lives in mise.toml (`e2e:serve`), which
        // delegates to scripts/e2e-serve.sh: it serves the production build
        // from .output on port 4300 with dummy data and the
        // changelog/disclaimer/onboarding overlays disabled. The `test:e2e`
        // task depends on `e2e:build`, so the bundle exists before this
        // command runs.
        //
        // NOTE: this invokes the script directly instead of `mise run
        // e2e:serve` on purpose. mise detaches its task into a separate
        // process group and flakily leaks the stdio pipes on shutdown, which
        // makes Playwright's webServer teardown hang forever (tests pass,
        // then the run stalls). The script exec's node as a single
        // foreground process, so signals and pipes behave. stdout/stderr are
        // piped so a failing server fails fast and visibly instead of eating
        // the whole webServer timeout.
        command: "sh scripts/e2e-serve.sh",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: "pipe",
        stderr: "pipe",
    },
});
