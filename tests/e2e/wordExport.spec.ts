import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";

// Verify the editor-to-download path against Word XML, not only the file extension.
test("exports current editor formatting with configurable defaults", async function ({ page }) {
    await page.goto("/");
    const editor = page.locator(".tiptap");
    await expect(editor).toBeVisible();
    await editor.fill("Schweizer Grüsse");
    await editor.press("ControlOrMeta+a");
    await page.getByTestId("format-heading").selectOption("1");
    await page.getByTestId("format-bold").click();
    await page.getByTestId("format-italic").click();
    await page.getByTestId("format-strike").click();
    await page.getByTestId("format-font").fill("Times New Roman");
    await page.getByTestId("format-font").press("Tab");
    await page.getByTestId("format-size").fill("14");
    await page.getByTestId("format-size").press("Tab");
    await page.getByTestId("downloadWordButton").click();
    await page.getByTestId("word-export-filename").fill("Mein Bericht");
    await page.getByTestId("word-export-font").fill("Aptos");
    await page.getByTestId("word-export-size").fill("11");
    await page.getByTestId("word-export-spacing").fill("1.5");
    await page.getByTestId("word-export-margins").selectOption("narrow");
    const downloading = page.waitForEvent("download");
    await page.getByTestId("word-export-submit").click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("Mein Bericht.docx");
    const path = await download.path();
    expect(path).toBeTruthy();
    const zip = await JSZip.loadAsync(await readFile(path!));
    const document = await zip.file("word/document.xml")!.async("string");
    const styles = await zip.file("word/styles.xml")!.async("string");
    expect(document).toContain("Schweizer Grüsse");
    expect(document).toContain('w:pStyle w:val="Heading1"');
    expect(document).toContain('w:ascii="Times New Roman"');
    expect(document).toContain('w:sz w:val="28"');
    expect(document).toContain("<w:b/>");
    expect(document).toContain("<w:i/>");
    expect(document).toContain("<w:strike/>");
    expect(document).toContain('w:left="720"');
    expect(styles).toContain('w:ascii="Aptos"');
    expect(styles).toContain('w:sz w:val="22"');
    expect(styles).toContain('w:val="de-CH"');
    expect(styles).toContain('w:line="360"');
});

test("saves defaults across reloads and discards cancelled drafts", async function ({ page }) {
    await page.goto("/");
    await page.locator(".tiptap").fill("Text");
    await page.getByTestId("downloadWordButton").click();
    await page.getByTestId("word-export-font").fill("Calibri");
    await page.getByRole("button", { name: "Als Standard speichern", exact: true }).click();
    await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
    await page.reload();
    await page.locator(".tiptap").fill("Text");
    await page.getByTestId("downloadWordButton").click();
    await expect(page.getByTestId("word-export-font")).toHaveValue("Calibri");
    await page.getByTestId("word-export-font").fill("Arial");
    await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
    await page.getByTestId("downloadWordButton").click();
    await expect(page.getByTestId("word-export-font")).toHaveValue("Calibri");
});

test("shows export errors and allows retry", async function ({ page }) {
    await page.goto("/");
    await page.locator(".tiptap").fill("Text");
    await page.getByTestId("downloadWordButton").click();
    await page.evaluate(function failOnce() {
        const original = URL.createObjectURL;
        URL.createObjectURL = function () {
            URL.createObjectURL = original;
            throw new Error("Test download failure");
        };
    });
    await page.getByTestId("word-export-submit").click();
    await expect(page.getByText("Download fehlgeschlagen", { exact: true })).toBeVisible();
    await expect(page.getByTestId("word-export-submit")).toBeEnabled();
    const downloading = page.waitForEvent("download");
    await page.getByTestId("word-export-submit").click();
    expect((await downloading).suggestedFilename()).toMatch(/\.docx$/);
});

test("exports even when saving defaults is blocked", async function ({ page }) {
    await page.addInitScript(function blockExportStorage() {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key === "textmate-word-export-settings") throw new Error("Storage blocked");
            original.call(this, key, value);
        };
    });
    await page.goto("/");
    await page.locator(".tiptap").fill("Text");
    await page.getByTestId("downloadWordButton").click();
    await page.getByRole("button", { name: "Als Standard speichern", exact: true }).click();
    await expect(page.getByText("Einstellungen konnten nicht gespeichert oder geladen werden. Der Export ist weiterhin möglich.", { exact: true })).toBeVisible();
    const downloading = page.waitForEvent("download");
    await page.getByTestId("word-export-submit").click();
    expect((await downloading).suggestedFilename()).toMatch(/\.docx$/);
});
