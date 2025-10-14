import { expect, Page, test } from "@playwright/test";
import { skipDisclaimer, skipTour } from "./utils";

import local from "../../i18n/locales/de.json" with { type: "json" };

const rewriteText = local.tools.rewrite;

async function switchToRewrite(page: Page) {
    await page.getByRole("button", { name: rewriteText }).click();
}

[
    { action: "bullet_points", buttonName: local.editor.bullet_points },
    { action: "summarize", buttonName: local.editor.summarize },
    { action: "social_mediafy", buttonName: local.editor.social_mediafy },
    { action: "plain_language", buttonName: local.editor.plain_language },
].forEach(({ action, buttonName }) => {
    test(`Text should show problems - ${action}`, async ({ page }) => {
        await page.goto("/");

        await skipDisclaimer(page);
        await skipTour(page);

        await switchToRewrite(page);

        const inputText = "This is a test.";

        await page.locator(".tiptap").fill(inputText);

        await page.getByRole("button", { name: buttonName }).click();

        await page.waitForTimeout(1000);

        const text = await page.locator(".tiptap").innerText();

        expect(text).toContain(`Action: ${action}`);
        expect(text).toContain(`Input: ${inputText}`);
    });
});

test("After rewrite, changes are shown on the rigt side", async ({ page }) => {
    await page.goto("/");

    await skipDisclaimer(page);
    await skipTour(page);

    await switchToRewrite(page);

    const inputText =
        "This is a test streaming response that returns one word at a time to demonstrate the functionality of server-sent events in this Nuxt application.";

    await page.locator(".tiptap").fill(inputText);

    await page.getByRole("button", { name: local.editor.rewrite }).click();

    await page.waitForTimeout(1000);

    await expect(
        page.locator("span.decoration-green-400[text='dummy']"),
    ).toBeVisible();

    await expect(
        page.locator("span.decoration-red-400[text='test']"),
    ).toBeVisible();
});
