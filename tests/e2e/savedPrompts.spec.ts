import { expect, type Page, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };
import { switchTo } from "./utils";

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".tiptap")).toBeVisible();
    await switchTo(page, "rewrite");
});

/** Saves an instruction under a name through the custom instructions drawer. */
async function saveFromCustomDrawer(
    page: Page,
    name: string,
    prompt: string,
): Promise<void> {
    await page
        .getByRole("button", { name: local.actions.custom, exact: true })
        .click();
    await page.getByTestId("customActionTextBox").fill(prompt);
    await page.getByTestId("savePromptToggle").click();
    await page.getByTestId("savePromptName").fill(name);
    await page.getByTestId("savePromptSubmit").click();
    await expect(
        page.getByText(local.savedPrompts.toast.saved).first(),
    ).toBeVisible();
    await page.keyboard.press("Escape");
}

/** Opens the saved prompt manager from the "Meine Aktionen" menu. */
async function openManager(page: Page): Promise<void> {
    await page.getByTestId("userActionsMenu").click();
    await page
        .getByRole("menuitem", { name: local.savedPrompts.manage })
        .click();
    await expect(page.getByTestId("savedPromptManager")).toBeVisible();
}

test("Saved prompt is applied from Meine Aktionen", async ({ page }) => {
    await page.locator(".tiptap").fill("This is a test.");
    await saveFromCustomDrawer(page, "Spass", "Make it fun!");

    await page.getByTestId("userActionsMenu").click();
    const item = page.getByRole("menuitem", { name: /Spass/ });
    await expect(item).toContainText(local.savedPrompts.local);
    await item.click();

    const diffReview = page.locator('[data-tour="diff-review"]');
    await expect(diffReview).toBeVisible();
    await expect(diffReview).toContainText("Action: custom");
    await expect(diffReview).toContainText("Options: Make it fun!");
});

test("Saved prompt is edited and deleted in the manager", async ({ page }) => {
    await page.locator(".tiptap").fill("This is a test.");
    await saveFromCustomDrawer(page, "Alt", "Old text");
    await openManager(page);

    const row = page.getByTestId("savedPromptRow").filter({ hasText: "Alt" });
    await row.getByTestId("savedPromptEdit").click();
    await page.getByTestId("savedPromptFormName").fill("Neu");
    await page.getByTestId("savedPromptFormSave").click();
    await expect(
        page.getByTestId("savedPromptRow").filter({ hasText: "Neu" }),
    ).toBeVisible();

    await page.getByTestId("savedPromptDelete").click();
    await page.getByTestId("savedPromptConfirmDelete").click();
    await expect(page.getByText(local.savedPrompts.empty)).toBeVisible();

    await page.keyboard.press("Escape");
    await page.getByTestId("userActionsMenu").click();
    await expect(page.getByRole("menuitem", { name: /Neu/ })).toHaveCount(0);
});

test("Prompts can be managed with an empty editor", async ({ page }) => {
    await openManager(page);

    await page.getByTestId("savedPromptNew").click();
    await page.getByTestId("savedPromptFormName").fill("Ohne Text");
    await page.getByTestId("savedPromptFormPrompt").fill("Some instruction");
    await page.getByTestId("savedPromptFormSave").click();

    const row = page
        .getByTestId("savedPromptRow")
        .filter({ hasText: "Ohne Text" });
    await expect(row).toBeVisible();
    await expect(row.getByTestId("savedPromptApply")).toBeDisabled();
});

test("Exported prompts can be imported again", async ({ page }, testInfo) => {
    await page.locator(".tiptap").fill("This is a test.");
    await saveFromCustomDrawer(page, "Export", "Export me");
    await openManager(page);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("savedPromptExport").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("textmate-prompts.json");
    const file = testInfo.outputPath("textmate-prompts.json");
    await download.saveAs(file);

    await page.getByTestId("savedPromptDelete").click();
    await page.getByTestId("savedPromptConfirmDelete").click();
    await expect(page.getByText(local.savedPrompts.empty)).toBeVisible();

    await page.getByTestId("savedPromptImportInput").setInputFiles(file);
    await expect(
        page.getByTestId("savedPromptRow").filter({ hasText: "Export" }),
    ).toBeVisible();
    await expect(page.getByText("1 hinzugefügt, 0 übersprungen")).toBeVisible();
});

test("An invalid import file shows an error", async ({ page }) => {
    await openManager(page);

    await page.getByTestId("savedPromptImportInput").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from("not json"),
    });

    await expect(
        page.getByText(local.savedPrompts.toast.invalidJson),
    ).toBeVisible();
});
