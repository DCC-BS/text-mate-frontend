import { execSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// Dedicated port so the E2E server never collides with (or silently reuses)
// a real dev server running on port 3000.
const baseURL = "http://localhost:4300";

/**
 * Reads the `e2e:serve` mise task so its command and env stay defined in
 * exactly one place: mise.toml. The Playwright webServer cannot spawn
 * `mise run e2e:serve` itself — mise detaches its task into a separate
 * process group and flakily leaks the stdio pipes on shutdown, which makes
 * Playwright's teardown hang forever (tests pass, then the run stalls). So
 * instead the task is mirrored here and run as a plain foreground process.
 */
function miseE2eServeTask(): { command: string; env: Record<string, string> } {
    const task = JSON.parse(
        execSync("mise tasks info e2e:serve --json", { encoding: "utf8" }),
    ) as { run?: string[]; env?: string[] };

    if (task.run?.length !== 1) {
        throw new Error(
            "e2e:serve mise task must have exactly one run command to be used as the Playwright webServer",
        );
    }

    // env entries come as "KEY=VALUE" strings; they are merged over
    // process.env by Playwright, so PATH etc. stay intact.
    const env: Record<string, string> = {};
    for (const pair of task.env ?? []) {
        const separator = pair.indexOf("=");
        env[pair.slice(0, separator)] = pair.slice(separator + 1);
    }
    return { command: task.run[0], env };
}

const serveTask = miseE2eServeTask();

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
        // Command and env are mirrored from the `e2e:serve` mise task (see
        // miseE2eServeTask). The `test:e2e` task depends on `e2e:build`, so
        // the bundle exists before this command runs. stdout/stderr are
        // piped so a failing server fails fast and visibly instead of
        // eating the whole webServer timeout.
        command: serveTask.command,
        env: serveTask.env,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: "pipe",
        stderr: "pipe",
    },
});
