export async function skipDisclaimer(page: Page) {
    await page.locator("#confirmation-checkbox").click();
}

export async function skipTour(page: Page) {
    await page.locator("#nt-action-skip").click();
}
