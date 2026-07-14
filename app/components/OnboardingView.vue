<script lang="ts" setup>
import { type Driver, type DriveStep, driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { AdvisorThread } from "~/assets/models/advisor";
import {
    AbandonDiffCommand,
    AddThreadCommand,
    ApplyTextCommand,
    ClearTextCommand,
    ClearThreadsCommand,
    Cmds,
    HideTextStatsCommand,
    type RestartTourCommand,
    RunExampleQuickActionCommand,
    ShowTextStatsCommand,
} from "~/assets/models/commands";

// Example Working Text seeded into the editor so the tour has content to act on.
const exampleText = "Schreibe hier deinen text.";

const { t, locale } = useI18n();
const { executeCommand, onCommand } = useCommandBus();
const { setRibbonTab } = useRibbonTab();

// Tour persistence — SSR-readable so first-time users skip the tour after hydration.
const tourCompleted = useCookie("tour-completed", { default: () => false });
const driverObj = ref<Driver>();

// Guards the example quick action so it runs at most once per visit to the
// Custom Action step, allowing back→forward navigation to re-seed the diff.
const exampleActionRun = ref(false);

// --- Tour state side-effects -------------------------------------------------

async function seedEditorText(): Promise<void> {
    await executeCommand(new ClearTextCommand());
    await executeCommand(new ApplyTextCommand(exampleText, { from: 0, to: 0 }));
}

async function runExampleQuickAction(): Promise<void> {
    if (exampleActionRun.value) return;
    exampleActionRun.value = true;
    await executeCommand(new RunExampleQuickActionCommand());
}

// Seed a fabricated Violation thread so the Threads rail becomes visible.
// AddThreadCommand is a pure local mutation — no backend, no doc selection.
function seedDemoThread(): void {
    const demoRange = { start: 0, end: exampleText.length };
    const thread: Omit<AdvisorThread, "id"> = {
        type: "violation",
        status: "to-fix",
        range: demoRange,
        notes: [],
        violation: {
            rule_name: t("tour.threads.demoRule"),
            file_name: t("tour.threads.demoDoc"),
            page_number: 1,
            reason: t("tour.threads.demoReason"),
            proposal: t("tour.threads.demoProposal"),
            source: exampleText,
            collection: "tour",
            range: demoRange,
        },
    };
    executeCommand(new AddThreadCommand(thread));
}

// Restore the workspace to a neutral state. Called on tour end, skip, restart
// and component unmount. Every command is idempotent.
async function cleanupTourState(): Promise<void> {
    await executeCommand(new ClearThreadsCommand());
    await executeCommand(new AbandonDiffCommand());
    await executeCommand(new HideTextStatsCommand());
    await executeCommand(new ClearTextCommand());
    setRibbonTab("transform");
    exampleActionRun.value = false;
}

// --- Step definitions --------------------------------------------------------

function buildSteps(): DriveStep[] {
    // Pre-build the Custom Action link so the description stays readable.
    const promptingLink = `<a href="${t("tour.customQuickAction.linkUrl")}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-600 font-medium">${t("tour.customQuickAction.linkText")}</a>`;

    return [
        // 1. Welcome — centered, no target.
        {
            popover: {
                title: t("tour.welcome.title"),
                description: t("tour.welcome.content"),
                side: "bottom",
                align: "center",
            },
        },
        // 2. Ribbon overview.
        {
            element: '[data-tour="ribbon"]',
            popover: {
                title: t("tour.ribbon.title"),
                description: t("tour.ribbon.content"),
                side: "bottom",
                align: "center",
            },
            onHighlightStarted: () => {
                setRibbonTab("transform");
            },
        },
        // 3. Editor — seed example text so later steps have content.
        {
            element: '[data-tour="text-editor"]',
            popover: {
                title: t("tour.editor.title"),
                description: t("tour.editor.content"),
                side: "top",
                align: "center",
            },
            onHighlightStarted: async () => {
                await seedEditorText();
            },
        },
        // 4. Text Statistics — open the popover while highlighted, close on leave.
        {
            element: '[data-tour="word-count"]',
            popover: {
                title: t("tour.wordCount.title"),
                description: t("tour.wordCount.content"),
                side: "top",
                align: "center",
            },
            onHighlightStarted: () => {
                executeCommand(new ShowTextStatsCommand());
            },
            onDeselected: () => {
                executeCommand(new HideTextStatsCommand());
            },
        },
        // 5. Transform tab.
        {
            element: '[data-tour="ribbon-transform"]',
            popover: {
                title: t("tour.transform.title"),
                description: t("tour.transform.content"),
                side: "bottom",
                align: "center",
            },
            onHighlightStarted: () => {
                setRibbonTab("transform");
            },
        },
        // 6. Built-in Quick Actions.
        {
            element: '[data-tour="quick-actions"]',
            popover: {
                title: t("tour.quickActions.title"),
                description: t("tour.quickActions.content"),
                side: "bottom",
                align: "center",
            },
            onHighlightStarted: () => {
                setRibbonTab("transform");
            },
        },
        // 7. Custom action — on next, seed the diff (async) then advance.
        {
            element: '[data-tour="custom-quick-action"]',
            popover: {
                title: t("tour.customQuickAction.title"),
                description: t("tour.customQuickAction.contentWithLink", {
                    link: promptingLink,
                }),
                side: "bottom",
                align: "center",
                onNextClick: async (_el, _step, opts) => {
                    await seedEditorText();
                    await runExampleQuickAction();
                    opts.driver.moveNext();
                },
            },
            onHighlightStarted: () => {
                setRibbonTab("transform");
                exampleActionRun.value = false;
            },
        },
        // 8. Diff Review — element is rendered once the workspace flips to
        //    diff-review (seeded by step 7's onNextClick). Abandon on leave.
        {
            element: '[data-tour="diff-review"]',
            popover: {
                title: t("tour.diffReview.title"),
                description: t("tour.diffReview.content"),
                side: "top",
                align: "center",
            },
            onDeselected: () => {
                executeCommand(new AbandonDiffCommand());
            },
        },
        // 9. Validate tab — on next, seed a demo violation thread then advance.
        {
            element: '[data-tour="ribbon-validate"]',
            popover: {
                title: t("tour.validate.title"),
                description: t("tour.validate.content"),
                side: "bottom",
                align: "center",
                onNextClick: async (_el, _step, opts) => {
                    seedDemoThread();
                    await nextTick();
                    opts.driver.moveNext();
                },
            },
            onHighlightStarted: () => {
                setRibbonTab("validate");
            },
        },
        // 10. Threads rail — rendered by v-if once a thread exists (seeded by
        //     step 9). Clear the demo thread on leave.
        {
            element: '[data-tour="threads-rail"]',
            popover: {
                title: t("tour.threads.title"),
                description: t("tour.threads.content"),
                side: "left",
                align: "start",
            },
            onDeselected: () => {
                executeCommand(new ClearThreadsCommand());
            },
        },
        // 11. Conclusion — the restart button.
        {
            element: '[data-tour="start-tour"]',
            popover: {
                title: t("tour.conclusion.title"),
                description: t("tour.conclusion.content"),
                side: "bottom",
                align: "center",
            },
            onHighlightStarted: () => {
                setRibbonTab("transform");
            },
        },
    ];
}

// --- Driver factory ----------------------------------------------------------

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

function createDriver(): Driver {
    // driver.js replaces {{current}}/{{total}} itself; we can't store this in
    // vue-i18n because its parser rejects the double-brace placeholders.
    const progressText = locale.value.startsWith("de")
        ? "Schritt {{current}} von {{total}}"
        : "Step {{current}} of {{total}}";
    return driver({
        showProgress: true,
        progressText,
        nextBtnText: t("tour.next"),
        prevBtnText: t("tour.prev"),
        doneBtnText: t("tour.finish"),
        popoverClass: "tm-tour-popover",
        steps: buildSteps(),
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
        // Fires on both user exit and programmatic destroy — clean state either way.
        onDestroyed: () => {
            driverObj.value = undefined;
            cleanupTourState();
        },
    });
}

// --- Lifecycle ---------------------------------------------------------------

function start(): void {
    driverObj.value = createDriver();
    driverObj.value.drive();
}

// Waits for the disclaimer modal to be accepted before auto-starting. While
// driver.js is active it sets `pointer-events: none` on every descendant
// except the highlighted element, which would make the disclaimer modal
// unclickable — so the tour must not start until the disclaimer is gone.
let readyObserver: MutationObserver | undefined;

function beginTourWhenReady(): void {
    if (tourCompleted.value) return;
    const modal = document.querySelector(".disclaimer-modal");
    if (!modal) {
        start();
        return;
    }
    readyObserver = new MutationObserver(() => {
        if (!modal.isConnected) {
            readyObserver?.disconnect();
            readyObserver = undefined;
            start();
        }
    });
    readyObserver.observe(document.body, { childList: true, subtree: true });
}

async function handleRestart(): Promise<void> {
    driverObj.value?.destroy();
    driverObj.value = undefined;
    await cleanupTourState();
    await nextTick();
    start();
}

onMounted(async () => {
    await nextTick();
    beginTourWhenReady();
});

onCommand<RestartTourCommand>(Cmds.RestartTourCommand, async () => {
    await handleRestart();
});

onUnmounted(() => {
    readyObserver?.disconnect();
    readyObserver = undefined;
    driverObj.value?.destroy();
    driverObj.value = undefined;
});
</script>

<template>
    <!-- Renderless: drives the driver.js onboarding overlay, no DOM of its own -->
    <span hidden aria-hidden="true" />
</template>

<style>
@reference "../assets/css/main.css";

/* driver.js popover theming for TextMate.
   Non-scoped because driver.js renders the popover outside this component. */
.driver-popover.tm-tour-popover {
    max-width: 450px;
}

.tm-tour-popover .driver-popover-next-btn {
    @apply bg-primary text-white;
}

.tm-tour-popover .driver-popover-prev-btn {
    @apply bg-primary text-white;
}

.tm-tour-popover .driver-popover-done-btn {
    @apply bg-success text-white;
}
</style>
