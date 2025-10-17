import { expect, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };
import { skipDisclaimer, skipTour } from "./utils";

test.beforeEach(async ({ page }) => {
    await page.goto("/");

    await skipDisclaimer(page);
    await skipTour(page);
});

test("Character count is displayed correctly", async ({ page }) => {
    const inputText = "Hello, world!";
    await page.fill(".tiptap", inputText);

    const charCount = await page.getByTestId("characterCount").textContent();

    expect(charCount).toContain(`${inputText.length} /`);
});
