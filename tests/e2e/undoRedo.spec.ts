import { expect, test } from "@playwright/test";
import { clearBrowserState } from "./utils";

test.beforeEach(async ({ page, context }) => {
    await clearBrowserState(page, context);
    await page.goto("/");
    try {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    } catch (error) {
    }
    await page.waitForSelector(".tiptap", { state: "visible", timeout: 15000 });
    await page.locator("#confirmation-checkbox").click();
    await page.locator("#nt-action-skip").click();
});

test("Undo and Redo buttons should be disabled when no action was taken", async ({
    page,
}) => {
    const undoButton = page.getByTestId("undo-button");
    const redoButton = page.getByTestId("redo-button");

    await expect(undoButton).toBeDisabled();
    await expect(redoButton).toBeDisabled();
});

test("Undo button should be enabled after an action was taken", async ({
    page,
}) => {
    const undoButton = page.getByTestId("undo-button");

    await page.locator(".tiptap").fill("This is a test.");

    await expect(undoButton).toBeEnabled();
});

test("Redo button should be enabled after an undo action was taken", async ({
    page,
}) => {
    const undoButton = page.getByTestId("undo-button");
    const redoButton = page.getByTestId("redo-button");

    await page.locator(".tiptap").fill("This is a test.");

    await expect(undoButton).toBeEnabled();

    await undoButton.click();

    await expect(redoButton).toBeEnabled();
});

test("Clicking undo and redo buttons should undo and redo the last action", async ({
    page,
}) => {
    const undoButton = page.getByTestId("undo-button");
    const redoButton = page.getByTestId("redo-button");
    const editor = page.locator(".tiptap");

    await editor.fill("This is a test.");

    await expect(editor).toHaveText("This is a test.");

    await undoButton.click();

    await expect(editor).toHaveText("");

    await redoButton.click();

    await expect(editor).toHaveText("This is a test.");
});
