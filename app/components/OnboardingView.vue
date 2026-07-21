<script lang="ts" setup>
import type { Onboarding } from "#components";
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

const { t } = useI18n();
const { executeCommand, onCommand } = useCommandBus();
const { setRibbonTab } = useRibbonTab();

// Tour persistence — SSR-readable so first-time users skip the tour after hydration.
const tourCompleted = useCookie("tour-completed", { default: () => false });
const onboading = ref<InstanceType<typeof Onboarding>>();

const promptingLink = `<a href="${t("tour.customQuickAction.linkUrl")}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-600 font-medium">${t("tour.customQuickAction.linkText")}</a>`;

const driverBuilder = useOnboardingBuilder({
    onDestroyed: () => {
        tourCompleted.value = true;
        cleanupTourState();
    },
})
    .addPhases<"inital" | "transform" | "diff" | "thread" | "end">([
        {
            name: "inital",
            onEnter: async () => {
                await seedEditorText();
            },
        },
        {
            name: "transform",
            onEnter: async () => {
                setRibbonTab("transform");
            },
        },
        {
            name: "diff",
            onEnter: async () => {
                // await seedEditorText();
                await runExampleQuickAction();
                await nextTick();
            },
            onExit: async () => {
                await executeCommand(new AbandonDiffCommand());
            },
        },
        {
            name: "thread",
            onEnter: async () => {
                setRibbonTab("validate");
                seedDemoThread();
                await nextTick();
            },
            onExit: async () => {
                setRibbonTab("transform");
                await executeCommand(new ClearThreadsCommand());
            },
        },
        {
            name: "end",
            onEnter: async () => {
                setRibbonTab("transform");
            },
        },
    ])
    .switchPhase("inital")
    .addSteps([
        // Welcome — centered, no target.
        {
            popover: {
                title: () => t("tour.welcome.title"),
                description: () => t("tour.welcome.content"),
                side: "bottom",
                align: "center",
            },
        },
    ])
    .switchPhase("transform")
    .addSteps([
        // Ribbon overview.
        {
            element: '[data-tour="ribbon"]',
            popover: {
                title: () => t("tour.ribbon.title"),
                description: () => t("tour.ribbon.content"),
                side: "bottom",
                align: "center",
            },
        },
        // Editor — seed example text so later steps have content.
        {
            element: '[data-tour="text-editor"]',
            popover: {
                title: () => t("tour.editor.title"),
                description: () => t("tour.editor.content"),
                side: "top",
                align: "center",
            },
        },
        // Word count button — on next, open the Text Statistics popover.
        {
            element: '[data-tour="word-count"]',
            popover: {
                title: () => t("tour.wordCount.title"),
                description: () => t("tour.wordCount.content"),
                side: "top",
                align: "center",
                onNextClick: async (_, __, options) => {
                    await executeCommand(new ShowTextStatsCommand());
                    options.driver.moveNext();
                },
            },
        },
        // Text Statistics popover content (opened by the word-count step's
        // onNextClick); close the popover when leaving.
        {
            element: '[data-tour="text-stats"]',
            popover: {
                title: () => t("tour.textStats.title"),
                description: () => t("tour.textStats.content"),
                side: "top",
                align: "center",
            },
            onDeselected: () => {
                executeCommand(new HideTextStatsCommand());
            },
        },
        // Transform tab.
        {
            element: '[data-tour="ribbon-transform"]',
            popover: {
                title: () => t("tour.transform.title"),
                description: () => t("tour.transform.content"),
                side: "bottom",
                align: "center",
            },
            onHighlightStarted: () => {
                setRibbonTab("transform");
            },
        },
        // Built-in Quick Actions.
        {
            element: '[data-tour="quick-actions"]',
            popover: {
                title: () => t("tour.quickActions.title"),
                description: () => t("tour.quickActions.content"),
                side: "bottom",
                align: "center",
            },
            onHighlightStarted: () => {
                setRibbonTab("transform");
            },
        },
        // Custom action — on next, seed the diff (async) then advance.
        {
            element: '[data-tour="custom-quick-action"]',
            popover: {
                title: () => t("tour.customQuickAction.title"),
                description: () => t("tour.customQuickAction.contentWithLink", {
                    link: promptingLink,
                }),
                side: "bottom",
                align: "center",
            },
            onHighlightStarted: () => {
                setRibbonTab("transform");
            },
        },
    ])
    .switchPhase("diff")
    .addSteps([
        // Diff Review intro. Element renders once the workspace flips to
        // diff-review (seeded by the custom action's onNextClick). The diff
        // must stay visible for the accept/discard/retry/split-view steps, so
        // it is only abandoned when leaving the split-view step below.
        {
            element: '[data-tour="diff-review"]',
            popover: {
                title: () => t("tour.diffReview.title"),
                description: () => t("tour.diffReview.content"),
                side: "top",
                align: "center",
            },
        },
        // Accept all changes at once.
        {
            element: '[data-tour="diff-accept-all"]',
            popover: {
                title: () => t("tour.diffAcceptAll.title"),
                description: () => t("tour.diffAcceptAll.content"),
                side: "bottom",
                align: "center",
            },
        },
        // Discard all changes at once.
        {
            element: '[data-tour="diff-discard-all"]',
            popover: {
                title: () => t("tour.diffDiscardAll.title"),
                description: () => t("tour.diffDiscardAll.content"),
                side: "bottom",
                align: "center",
            },
        },
        // Retry — re-run the last action on the original text.
        {
            element: '[data-tour="retry-quick-action"]',
            popover: {
                title: () => t("tour.retry.title"),
                description: () => t("tour.retry.content"),
                side: "bottom",
                align: "center",
            },
        },
        // Split view toggle — last diff step; abandon the diff when leaving so
        // the editor is restored for the Validate steps.
        {
            element: '[data-tour="diff-split-view"]',
            popover: {
                title: () => t("tour.diffSplitView.title"),
                description: () => t("tour.diffSplitView.content"),
                side: "bottom",
                align: "center",
            },
        },
    ])
    .switchPhase("thread")
    .addSteps([
        // Validate tab — on next, seed a demo violation thread then advance.
        {
            element: '[data-tour="ribbon-validate"]',
            popover: {
                title: () => t("tour.validate.title"),
                description: () => t("tour.validate.content"),
                side: "bottom",
                align: "center",
            },
        },
        // Check tab — on next, check the demo thread for errors.
        {
            element: '[data-tour="ribbon-check"]',
            popover: {
                title: () => t("tour.check.title"),
                description: () => t("tour.check.content"),
                side: "bottom",
                align: "center"
            }
        },
        // Threads rail — rendered by v-if once a thread exists (seeded by the
        // validate step). Clear the demo thread on leave.
        {
            element: '[data-tour="threads-rail"]',
            popover: {
                title: () => t("tour.threads.title"),
                description: () => t("tour.threads.content"),
                side: "left",
                align: "start",
            },
        },
    ])
    .switchPhase("end")
    .addSteps([
        // Conclusion — the restart button.
        {
            element: '[data-tour="start-tour"]',
            popover: {
                title: () => t("tour.conclusion.title"),
                description: () => t("tour.conclusion.content"),
                side: "bottom",
                align: "center",
            },
        },
    ]);

async function seedEditorText(): Promise<void> {
    await executeCommand(new ClearTextCommand());
    await executeCommand(new ApplyTextCommand(exampleText, { from: 0, to: 0 }));
}

async function runExampleQuickAction(): Promise<void> {
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
}

async function handleRestart(): Promise<void> {
    onboading.value?.destroy();
    await cleanupTourState();
    await nextTick();
    onboading.value?.start();
}

onCommand<RestartTourCommand>(Cmds.RestartTourCommand, async () => {
    await handleRestart();
});

</script>

<template>
    <Onboarding ref="onboading" :onboading-builder="driverBuilder" />
</template>
