import type { Page, BrowserContext } from "@playwright/test";

import local from "../../i18n/locales/de.json" with { type: "json" };

const rewriteText = local.tools.rewrite;
const problemText = local.tools.problems;
const advisorText = local.tools.advisor;

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
    } catch {
    }
}

export async function setupFreshBrowser(page: Page, context: BrowserContext) {
    await clearBrowserState(page, context);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    try {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    } catch (error) {
    }
    await page.waitForSelector(".tiptap", { state: "visible", timeout: 15000 });
    await skipDisclaimer(page);
    await skipTour(page);
    await switchTo(page, "rewrite");
}

export async function skipDisclaimer(page: Page) {
    await page.waitForSelector("#confirmation-checkbox", { state: "visible", timeout: 15000 });
    await page.locator("#confirmation-checkbox").click();
}

export async function skipTour(page: Page) {
    await page.waitForSelector("#nt-action-skip", { state: "visible", timeout: 5000 });
    await page.locator("#nt-action-skip").click();
}

export async function switchTo(
    page: Page,
    tool: "rewrite" | "problems" | "advisor",
) {
    switch (tool) {
        case "rewrite":
            await page.getByRole("button", { name: rewriteText }).click();
            break;
        case "problems":
            await page.getByRole("button", { name: problemText }).click();
            break;
        case "advisor":
            await page.getByRole("button", { name: advisorText }).click();
            break;
    }
}
