import { expect, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };
import { switchTo, acceptAllChanges } from "./utils";

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".tiptap")).toBeVisible();
    await switchTo(page, "rewrite");
});

[
    {
        action: "bullet_points",
        buttonName: local.editor.bullet_points,
        secondButtonName: undefined as string | undefined,
        config: "",
    },
    {
        action: "summarize",
        buttonName: local.editor.summarize,
        secondButtonName: local["quick-actions"].summarize.sentence,
        config: "sentence",
    },
    {
        action: "summarize",
        buttonName: local.editor.summarize,
        secondButtonName: local["quick-actions"].summarize.three_sentence,
        config: "three_sentence",
    },
    {
        action: "summarize",
        buttonName: local.editor.summarize,
        secondButtonName: local["quick-actions"].summarize.paragraph,
        config: "paragraph",
    },
    {
        action: "summarize",
        buttonName: local.editor.summarize,
        secondButtonName: local["quick-actions"].summarize.page,
        config: "page",
    },
    {
        action: "social_mediafy",
        buttonName: local.editor.social_mediafy,
        secondButtonName: local["quick-actions"]["social-mediafy"].bluesky,
        config: "bluesky",
    },
    {
        action: "social_mediafy",
        buttonName: local.editor.social_mediafy,
        secondButtonName: local["quick-actions"]["social-mediafy"].instagram,
        config: "instagram",
    },
    {
        action: "social_mediafy",
        buttonName: local.editor.social_mediafy,
        secondButtonName: local["quick-actions"]["social-mediafy"].linkedin,
        config: "linkedin",
    },
    {
        action: "formality",
        buttonName: local.editor.formality,
        secondButtonName: local["quick-actions"].formality.formal,
        config: "formal",
    },
    {
        action: "formality",
        buttonName: local.editor.formality,
        secondButtonName: local["quick-actions"].formality.informal,
        config: "informal",
    },
    {
        action: "medium",
        buttonName: local.editor.medium,
        secondButtonName: local["quick-actions"].medium.email,
        config: "email",
    },
    {
        action: "medium",
        buttonName: local.editor.medium,
        secondButtonName: local["quick-actions"].medium.official_letter,
        config: "official_letter",
    },
    {
        action: "medium",
        buttonName: local.editor.medium,
        secondButtonName: local["quick-actions"].medium.presentation,
        config: "presentation",
    },
    {
        action: "medium",
        buttonName: local.editor.medium,
        secondButtonName: local["quick-actions"].medium.report,
        config: "report",
    },
].forEach(({ action, buttonName, secondButtonName, config }) => {
    test(`Text should be edited - ${action} - ${secondButtonName}`, async ({
        page,
    }) => {
        const inputText = "This is a test.";

        await page.locator(".tiptap").fill(inputText);

        await page
            .getByRole("button", { name: buttonName, exact: true })
            .click();

        if (secondButtonName) {
            await page
                .getByRole("menuitem", { name: secondButtonName, exact: true })
                .click();
        }

        // The quick action streams into the diff review
        const diffReview = page.locator('[data-tour="diff-review"]');
        await expect(diffReview).toBeVisible();
        await expect(diffReview).toContainText(`Action: ${action}`);
        await expect(diffReview).toContainText(`Input: ${inputText}`);
        await expect(diffReview).toContainText(`Options: ${config}`);

        // Accepting all changes applies the result to the editor
        await acceptAllChanges(page);
        await expect(page.locator(".tiptap")).toContainText(
            `Action: ${action}`,
        );
    });
});

test("After rewrite, changes are shown in the diff review", async ({ page }) => {
    const inputText =
        "This is a test streaming response that returns one word at a time to demonstrate the functionality of server-sent events in this Nuxt application.";

    await page.locator(".tiptap").fill(inputText);

    await page
        .getByRole("button", { name: local.editor.plain_language, exact: true })
        .click();

    const diffReview = page.locator('[data-tour="diff-review"]');
    await expect(diffReview).toBeVisible();

    // Word-level diff: "test" was replaced by "dummy"
    await expect(
        diffReview.locator("span.bg-red-50").filter({ hasText: "test" }),
    ).toBeVisible();
    await expect(
        diffReview.locator("span.bg-green-100").filter({ hasText: "dummy" }),
    ).toBeVisible();
});

test("Custom action button should be present", async ({ page }) => {
    await page.locator(".tiptap").fill("This is a test.");

    await page
        .getByRole("button", { name: local.actions.custom, exact: true })
        .click();

    await page.getByTestId("customActionTextBox").fill("Make it fun!");
    await page.getByTestId("customActionSubmit").click();

    const diffReview = page.locator('[data-tour="diff-review"]');
    await expect(diffReview).toBeVisible();
    await expect(diffReview).toContainText("Action: custom");
    await expect(diffReview).toContainText("Input: This is a test.");
    await expect(diffReview).toContainText("Options: Make it fun!");
});
