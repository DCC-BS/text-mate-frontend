// --- Driver factory ----------------------------------------------------------

import { type Config, type DriveStep, driver } from "driver.js";

// Lucide icon path bodies (stable artwork, inlined to avoid bundling the whole
// @iconify-json/lucide collection for three icons). Icons in this project render
// via @nuxt/icon's inline-SVG component, so a raw `i-lucide-*` class on a DOM
// element would not render — we inject real SVGs here.
const LUCIDE_PATHS = {
    "arrow-big-left":
        '<path d="M10.793 19.793a.707.707 0 0 0 1.207-.5V16a1 1 0 0 1 1-1h6a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-6a1 1 0 0 1-1-1V4.707a.707.707 0 0 0-1.207-.5l-6.94 6.94a1.207 1.207 0 0 0 0 1.707z"/>',
    "arrow-big-right":
        '<path d="M13.207 19.793a.707.707 0 0 1-1.207-.5V16a1 1 0 0 0-1-1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h6a1 1 0 0 0 1-1V4.707a.707.707 0 0 1 1.207-.5l6.94 6.94a1.207 1.207 0 0 1 0 1.707z"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
} as const;

function lucideIconSvg(name: keyof typeof LUCIDE_PATHS): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-0.2em;margin-right:0.25rem">${LUCIDE_PATHS[name]}</svg>`;
}

export function useDriverFactory() {
    const { t } = useI18n();
    const tourCompleted = ref(false);

    function createDriver(steps: DriveStep[], additionalOptions: Config = {}) {
        return driver({
            showProgress: true,
            progressText: t("tour.progress"),
            nextBtnText: t("tour.next"),
            prevBtnText: t("tour.prev"),
            doneBtnText: t("tour.finish"),
            popoverClass: "tm-tour-popover",
            steps: steps,
            // Inject Lucide icons into the footer buttons and stamp a stable
            // testid on the close (skip) button for E2E selectors.
            onPopoverRender: (popover, opts) => {
                popover.previousButton.insertAdjacentHTML(
                    "afterbegin",
                    lucideIconSvg("arrow-big-left"),
                );
                popover.nextButton.insertAdjacentHTML(
                    "afterbegin",
                    lucideIconSvg(
                        opts.driver.isLastStep() ? "check" : "arrow-big-right",
                    ),
                );
                // Close button doubles as "skip tour".
                popover.closeButton.setAttribute("data-testid", "tour-skip");
            },
            // User-initiated exit (close/done) — mark completed, then proceed.
            // Programmatic destroy() skips this hook, so restart stays un-recorded.
            onDestroyStarted: (_el, _step, opts) => {
                tourCompleted.value = true;
                opts.driver.destroy();
            },
            ...additionalOptions,
        });
    }

    return {
        createDriver,
        tourCompleted,
    };
}
