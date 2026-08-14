import { expect, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".tiptap")).toBeVisible();
});

test("Character count is displayed correctly", async ({ page }) => {
    const inputText = "Hello, world!";
    await page.fill(".tiptap", inputText);

    await expect(page.getByTestId("characterCountButton")).toContainText(
        `${inputText.length} /`,
    );
});

test("Text statistics are updated on text change", async ({ page }) => {
    const inputText1 = "Hello, world!";
    const inputText2 = "This is a test.";

    await page.fill(".tiptap", inputText1);
    await page.getByTestId("characterCountButton").click();

    await expect(page.getByTestId("characterCount")).toContainText(
        inputText1.length.toString(),
    );
    await expect(page.getByTestId("wordCount")).toContainText("2");
    await expect(page.getByTestId("characterCount")).toContainText("13");
    await expect(page.getByTestId("syllableCount")).toContainText("3");
    await expect(page.getByTestId("averageSentenceLength")).toContainText("2");
    await expect(page.getByTestId("averageSyllablesPerWord")).toContainText(
        "1.5",
    );

    await page.fill(".tiptap", inputText2);

    await page.getByTestId("characterCountButton").click();

    await expect(page.getByTestId("wordCount")).toContainText("4");
    await expect(page.getByTestId("characterCount")).toContainText("15");
    await expect(page.getByTestId("syllableCount")).toContainText("4");
    await expect(page.getByTestId("averageSentenceLength")).toContainText("4");
    await expect(page.getByTestId("averageSyllablesPerWord")).toContainText("1");
});
