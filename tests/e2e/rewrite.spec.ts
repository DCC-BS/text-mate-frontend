import { expect, Page, test } from "@playwright/test";
import { skipDisclaimer, skipTour } from "./utils";

import local from "../../i18n/locales/de.json" with { type: "json" };

const rewriteText = local.tools.rewrite;

async function switchToRewrite(page: Page) {
    await page.getByRole("button", { name: rewriteText }).click();
}

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
        await page.goto("/");

        await skipDisclaimer(page);
        await skipTour(page);

        await switchToRewrite(page);

        const inputText = "This is a test.";

        await page.locator(".tiptap").fill(inputText);

        await page
            .getByRole("button", { name: buttonName, exact: true })
            .click();

        if (secondButtonName) {
            await page
                .getByRole("button", { name: secondButtonName, exact: true })
                .click();
        }

        await page.waitForTimeout(1500);

        const text = await page.locator(".tiptap").innerText();

        expect(text).toContain(`Action: ${action}`);
        expect(text).toContain(`Input: ${inputText}`);
        expect(text).toContain(`Options: ${config}`);
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

    await page
        .getByRole("button", { name: local.editor.plain_language, exact: true })
        .click();

    await page.waitForTimeout(1000);

    await expect(
        page.locator("span.decoration-green-400[text='dummy']"),
    ).toBeVisible();

    await expect(
        page.locator("span.decoration-red-400[text='test']"),
    ).toBeVisible();
});

// TODO test custom action
