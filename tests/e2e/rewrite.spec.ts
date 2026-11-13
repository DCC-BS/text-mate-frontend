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
        "Gemäss der Verordnung über die Erhebung von Gebühren ist die Antragstellerin verpflichtet, die erforderlichen Unterlagen unverzüglich und vollständig einzureichen, damit die zuständige Fachstelle die Prüfung vornehmen kann.";

    await page.locator(".tiptap").fill(inputText);

    await page
        .getByRole("button", { name: local.editor.plain_language, exact: true })
        .click();

    const diffReview = page.locator('[data-tour="diff-review"]');
    await expect(diffReview).toBeVisible();

    // Before/after readability lands in the diff header once `done` arrives.
    await expect(page.getByTestId("simplifyScoreComparison")).toBeVisible({
        timeout: 60_000,
    });

    // The dummy simplify replaces words and splits long sentences, so the
    // client-side word diff shows removed and added spans.
    await expect(
        diffReview.locator("span.bg-red-50").filter({ hasText: "Gemäss" }),
    ).toBeVisible();
    await expect(
        diffReview.locator("span.bg-green-100").filter({ hasText: "Nach" }),
    ).toBeVisible();
    await expect(
        diffReview.locator("span.bg-red-50").filter({ hasText: "unverzüglich" }),
    ).toBeVisible();
    await expect(
        diffReview.locator("span.bg-green-100").filter({ hasText: "sofort" }),
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

test("Quick action shows progress and locks the ribbon while the request is queued", async ({
    page,
}) => {
    // Hold the request back to simulate a busy LLM queue: no response headers
    // arrive until we release it.
    let release: () => void = () => {};
    const released = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route("**/api/quick-action", async (route) => {
        await released;
        await route.continue();
    });

    await page.locator(".tiptap").fill("This is a test.");

    const button = page.getByRole("button", {
        name: local.editor.bullet_points,
        exact: true,
    });
    await button.click();

    // The diff review with its generating indicator is shown immediately,
    // and the action cannot be triggered a second time.
    const diffReview = page.locator('[data-tour="diff-review"]');
    await expect(diffReview).toBeVisible();
    await expect(diffReview).toContainText(local.workspace.generating);
    await expect(button).toBeDisabled();

    // The global progress indicator names the running operation.
    const progressLabel = page.getByText(local.status.quickAction, {
        exact: true,
    });
    await expect(progressLabel).toBeVisible();
    await page.screenshot({
        path: "test-results/quick-action-queued.png",
    });

    release();

    await expect(diffReview).toContainText("Action: bullet_points");
    await expect(diffReview).not.toContainText(local.workspace.generating);
    await expect(progressLabel).toBeHidden();
});

test("Quick action failure before streaming returns to the editor", async ({
    page,
}) => {
    await page.route("**/api/quick-action", (route) =>
        route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ errorId: "unexpected_error" }),
        }),
    );

    await page.locator(".tiptap").fill("This is a test.");
    await page
        .getByRole("button", { name: local.editor.bullet_points, exact: true })
        .click();

    await expect(page.locator(".tiptap")).toBeVisible();
    await expect(page.locator(".tiptap")).toContainText("This is a test.");
    await expect(page.locator('[data-tour="diff-review"]')).toBeHidden();
});

test("Uploading a document that exceeds the character limit shows an error", async ({
    page,
}) => {
    // 100,000 text characters plus a hard break: the editor counts the break
    // too (100,001), so a plain textContent check would miss it.
    const longText = `${"a".repeat(99_999)}<br>b`;
    await page.route("**/api/convert", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ html: `<p>${longText}</p>` }),
        }),
    );

    await page.locator(".tiptap").fill("Original text");
    await page.locator('input[type="file"]').first().setInputFiles({
        name: "long.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("irrelevant"),
    });

    await expect(
        page.getByText(local.upload.error, { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText(/100[.,’']?001/).first()).toBeVisible();
    await expect(page.locator(".tiptap")).toContainText("Original text");
});
