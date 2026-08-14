import { expect, type Page } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };

/**
 * Switches the workspace to the given tool via the ribbon tabs in the
 * navigation menu. The transform tab is the default, so switching to
 * "rewrite" is mostly a no-op that keeps the intent explicit.
 */
export async function switchTo(page: Page, tool: "rewrite" | "advisor") {
    const selector =
        tool === "rewrite"
            ? '[data-tour="ribbon-transform"]'
            : '[data-tour="ribbon-validate"]';
    await page.locator(selector).click();
}

/**
 * Accepts all hunks of the current diff review and waits until the editor
 * is back with the applied text.
 */
export async function acceptAllChanges(page: Page) {
    await page
        .getByRole("button", { name: local.advisor.acceptAll })
        .click();
    await expect(page.locator(".tiptap")).toBeVisible();
}
