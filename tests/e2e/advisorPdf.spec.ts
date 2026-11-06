import { expect, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };
import { switchTo } from "./utils";

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".tiptap")).toBeVisible();
});

test("Opening a rule's source document renders the PDF", async ({ page }) => {
    // Matches the dummy "Passivkonstruktionen vermeiden" rule (beispiel-dokument.pdf, page 1).
    await page.fill(".tiptap", "Der Antrag wurde vom Amt geprüft und es ist entschieden worden.");

    await switchTo(page, "advisor");
    await page.locator('[data-tour="ribbon-check"]').click();
    await page.getByText("Beispiel-Dokument").first().click();
    await page.getByRole("button", { name: local.advisor.applyDocs }).click();

    await page
        .getByRole("button", { name: "beispiel-dokument.pdf" })
        .first()
        .click();

    // The page count is only known once pdf.js has parsed the document.
    await expect(
        page.getByText(
            local.advisor.pdfViewer.pageIndicator
                .replace("{current}", "1")
                .replace("{total}", "1"),
        ),
    ).toBeVisible();
    await expect(page.locator(".pdf-container canvas").first()).toBeVisible();
});
