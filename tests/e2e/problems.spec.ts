import { expect, test } from "@playwright/test";
import { skipDisclaimer, skipTour, switchTo } from "./utils";

test.beforeEach(async ({ page }) => {
    await page.goto("/");

    await skipDisclaimer(page);
    await skipTour(page);
    await switchTo(page, "problems");
});

test("Text should show problems", async ({ page }) => {
    await page.locator(".tiptap").fill("This is a test.");

    await page.locator("span.correction").first().waitFor({ state: 'visible', timeout: 5000 });

    const textCorrectionCount = await page.locator("span.correction").all();

    expect(textCorrectionCount.length).toEqual(2);
    expect(textCorrectionCount[0]).toContainText("is");
    expect(textCorrectionCount[1]).toContainText("test.");
});
