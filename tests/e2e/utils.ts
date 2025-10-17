import type { Page } from "playwright/test";

import local from "../../i18n/locales/de.json" with { type: "json" };

const rewriteText = local.tools.rewrite;
const problemText = local.tools.problems;
const adivisorText = local.tools.advisor;

export async function skipDisclaimer(page: Page) {
    await page.locator("#confirmation-checkbox").click();
}

export async function skipTour(page: Page) {
    await page.locator("#nt-action-skip").click();
}

export async function switchTo(
    page: Page,
    tool: "rewrite" | "problems" | "adivisor",
) {
    switch (tool) {
        case "rewrite":
            await page.getByRole("button", { name: rewriteText }).click();
            break;
        case "problems":
            await page.getByRole("button", { name: problemText }).click();
            break;
        case "adivisor":
            await page.getByRole("button", { name: adivisorText }).click();
            break;
    }
}
