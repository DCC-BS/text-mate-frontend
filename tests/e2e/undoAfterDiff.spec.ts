import { expect, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".tiptap")).toBeVisible();
});

test("Undo reverts a committed quick action", async ({ page }) => {
    const inputText = "This is a test.";
    const editor = page.locator(".tiptap");
    const undoButton = page.getByTestId("undo-button");
    const redoButton = page.getByTestId("redo-button");

    await editor.fill(inputText);

    await page
        .getByRole("button", { name: local.editor.bullet_points, exact: true })
        .click();

    const acceptAll = page.locator('[data-tour="diff-accept-all"]');
    await expect(acceptAll).toBeEnabled({ timeout: 30_000 });
    await acceptAll.click();

    await expect(editor).toBeVisible();
    await expect(editor).toContainText("Action: bullet_points");

    // The committed diff is one history step: undo restores the Working Text.
    await expect(undoButton).toBeEnabled();
    await undoButton.click();

    await expect(editor).toHaveText(inputText);

    await expect(redoButton).toBeEnabled();
    await redoButton.click();

    await expect(editor).toContainText("Action: bullet_points");
});
