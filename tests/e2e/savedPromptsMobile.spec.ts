import { expect, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };

// Phone width: the app renders the mobile ribbon below the `md` breakpoint.
test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".tiptap")).toBeVisible();
});

test("Prompt saved on mobile appears and applies", async ({ page }) => {
    await page.locator(".tiptap").fill("This is a test.");
    await page.locator('[data-tour="custom-quick-action-mobile"]').click();
    await page.getByTestId("mobileCustomAction").click();
    await page.getByTestId("customSheetTextBox").fill("Make it short!");
    await page.getByTestId("savePromptToggle").click();
    await page.getByTestId("savePromptName").fill("Mobil-Prompt");
    await page.getByTestId("savePromptSubmit").click();
    await expect(
        page.getByText(local.savedPrompts.toast.saved).first(),
    ).toBeVisible();

    // Close the nested custom sheet; the "Weitere Aktionen" drawer stays open.
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Mobil-Prompt" }).click();

    const diffReview = page.locator('[data-tour="diff-review"]');
    await expect(diffReview).toBeVisible();
    await expect(diffReview).toContainText("Options: Make it short!");
});

test("Prompt manager opens on mobile with an empty editor", async ({
    page,
}) => {
    await page.locator('[data-tour="custom-quick-action-mobile"]').click();
    await page.getByTestId("savedPromptManageMobile").click();

    await expect(page.getByTestId("savedPromptManager")).toBeVisible();
});

test("Text actions in the drawer stay inactive with an empty editor", async ({
    page,
}) => {
    await page.locator('[data-tour="custom-quick-action-mobile"]').click();
    const customRow = page.getByTestId("mobileCustomAction");
    await customRow.scrollIntoViewIfNeeded();
    await customRow.click({ force: true });

    await expect(page.getByTestId("customSheetTextBox")).toHaveCount(0);
});
