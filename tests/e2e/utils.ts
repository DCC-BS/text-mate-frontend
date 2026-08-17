import type { Page, BrowserContext } from "@playwright/test";

import local from "../../i18n/locales/de.json" with { type: "json" };

const rewriteText = local.ribbon.transform;
const advisorText = local.ribbon.validate;

export async function clearBrowserState(page: Page, context: BrowserContext) {
    await context.clearCookies();
    try {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();

            const req = indexedDB.deleteDatabase("*");
            req.onsuccess = () => {};
            req.onerror = () => {};

            const databases = indexedDB.databases();
            if (databases) {
                databases.then((dbs) => {
                    dbs.forEach((db) => {
                        if (db.name) {
                            indexedDB.deleteDatabase(db.name);
                        }
                    });
                });
            }
        });
    } catch {}
}

/** Must match `baseURL` in playwright.config.ts — cookies are set per origin. */
const APP_URL = "http://localhost:3000";

/**
 * Marks the guided tour as completed before the app boots. Clicking the skip
 * button instead races the tour's own setup: its first phase seeds example
 * text into the editor, and a skip that lands mid-seed leaves that text (and
 * its history entry) behind.
 */
export async function disableTour(context: BrowserContext) {
    await context.addCookies([
        { name: "tour-completed", value: "true", url: APP_URL },
    ]);
}

/**
 * Opens the app on an empty workspace: no tour, disclaimer accepted, and
 * optionally a ribbon tab selected.
 */
export async function setupWorkspace(
    page: Page,
    context: BrowserContext,
    options: { tab?: "rewrite" | "advisor" } = {},
) {
    await clearBrowserState(page, context);
    await disableTour(context);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector(".tiptap", { state: "visible", timeout: 15000 });
    await skipDisclaimer(page);
    await page.waitForSelector("#confirmation-checkbox", { state: "detached" });
    if (options.tab) {
        await switchTo(page, options.tab);
    }
}

export async function setupFreshBrowser(page: Page, context: BrowserContext) {
    await setupWorkspace(page, context, { tab: "rewrite" });
}

/**
 * Accepts every hunk of the open Diff Review, committing its text back into
 * the editor. Quick actions, advisor fixes and simplifications all land here
 * instead of writing to the editor directly.
 */
export async function acceptDiff(page: Page) {
    const acceptAll = page.locator('[data-tour="diff-accept-all"]');
    await acceptAll.waitFor({ state: "visible", timeout: 30000 });
    await acceptAll.click();
}

export async function skipDisclaimer(page: Page) {
    await page.waitForSelector("#confirmation-checkbox", {
        state: "visible",
        timeout: 15000,
    });
    await page.locator("#confirmation-checkbox").click();
}

export async function switchTo(page: Page, tool: "rewrite" | "advisor") {
    switch (tool) {
        case "rewrite":
            await page.getByRole("button", { name: rewriteText }).click();
            break;
        case "advisor":
            await page.getByRole("button", { name: advisorText }).click();
            break;
    }
}
