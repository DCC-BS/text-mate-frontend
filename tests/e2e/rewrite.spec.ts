import { expect, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };
import { acceptDiff, setupWorkspace } from "./utils";

test.beforeEach(async ({ page, context }) => {
    await setupWorkspace(page, context, { tab: "rewrite" });
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

        // The result lands in a Diff Review; only accepting it writes back.
        await acceptDiff(page);

        const editor = page.locator(".tiptap");
        await expect(editor).toContainText(`Action: ${action}`);
        await expect(editor).toContainText(`Input: ${inputText}`);
        // `bullet_points` carries no option, so the dummy backend echoes an
        // empty value — normalised text matching would drop the trailing space.
        await expect(editor).toContainText(`Options: ${config}`.trimEnd());
    });
});

test("Plain Language runs the simplification loop and opens the diff", async ({
    page,
}) => {
    const inputText =
        "Gemäss der Verordnung über die Erhebung von Gebühren ist die Antragstellerin verpflichtet, die erforderlichen Unterlagen unverzüglich und vollständig einzureichen, damit die zuständige Fachstelle die Prüfung vornehmen kann.";

    await page.locator(".tiptap").fill(inputText);

    await page
        .getByRole("button", { name: local.editor.plain_language, exact: true })
        .click();

    // The loop streams progress long before it produces any text.
    await expect(page.getByTestId("simplifyProgress")).toBeVisible();

    // Before/after readability lands in the diff header once `done` arrives.
    await expect(page.getByTestId("simplifyScoreComparison")).toBeVisible({
        timeout: 60_000,
    });

    // The diff itself is the existing client-side word diff.
    await expect(page.locator("span.bg-green-100").first()).toBeVisible();
    await expect(page.locator("span.bg-red-50").first()).toBeVisible();
});

test("Custom action button should be present", async ({ page }) => {
    await page.locator(".tiptap").fill("This is a test.");

    await page.getByRole("button", { name: local.actions.custom }).click();

    await page.getByTestId("customActionTextBox").fill("Make it fun!");
    await page.getByTestId("customActionSubmit").click();

    await acceptDiff(page);

    const editor = page.locator(".tiptap");
    await expect(editor).toContainText("Action: custom");
    await expect(editor).toContainText("Input: This is a test.");
    await expect(editor).toContainText("Options: Make it fun!");
});
