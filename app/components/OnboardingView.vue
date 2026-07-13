<script lang="ts" setup>
import type { VTour } from "#components";
import type { ButtonProp, TourStep } from "#nuxt-tour/props";
import {
    AbandonDiffCommand,
    ApplyTextCommand,
    ClearTextCommand,
    Cmds,
    HideTextStatsCommand,
    type RestartTourCommand,
    RunExampleQuickActionCommand,
    ShowTextStatsCommand,
} from "~/assets/models/commands";

const exampleText = "Schreibe hier deinen text.";

const { t } = useI18n();
const { executeCommand, onCommand } = useCommandBus();
const { setRibbonTab } = useRibbonTab();

const tour = ref<InstanceType<typeof VTour>>();

// Tour state
const tourCompleted = useCookie("tour-completed", { default: () => false });
const showTour = ref(false);
const tourIsActive = ref(false);
const trapFocus = ref(false);

// Ensures the example quick action runs only once per tour run.
const exampleActionRun = ref(false);

async function runExampleQuickAction(): Promise<void> {
    if (exampleActionRun.value) return;
    exampleActionRun.value = true;
    await executeCommand(new RunExampleQuickActionCommand());
}

// Tour control functions
function startTour(): void {
    showTour.value = true;
    exampleActionRun.value = false;
    setRibbonTab("transform");
    tour.value?.startTour();
}

function onTourStart(): void {
    tourIsActive.value = true;
    window.addEventListener("keydown", handleKeyboardNavigation);
}

async function onTourComplete(): Promise<void> {
    tourCompleted.value = true;
    tourIsActive.value = false;
    window.removeEventListener("keydown", handleKeyboardNavigation);
    await executeCommand(new AbandonDiffCommand());
    await executeCommand(new ClearTextCommand());
    setRibbonTab("transform");
}

// Keyboard navigation handler
function handleKeyboardNavigation(event: KeyboardEvent): void {
    if (!tourIsActive.value) return;

    const target = event.target as HTMLElement;
    if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
    ) {
        return;
    }

    switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
            event.preventDefault();
            tour.value?.nextStep();
            break;
        case "ArrowLeft":
        case "ArrowUp":
            event.preventDefault();
            tour.value?.prevStep();
            break;
        case "Escape":
            event.preventDefault();
            tour.value?.endTour();
            break;
    }
}

// Tour steps for the ribbon-driven workspace
const steps = [
    {
        title: t("tour.welcome.title"),
        body: t("tour.welcome.content"),
    },
    {
        target: '[data-tour="ribbon"]',
        title: t("tour.ribbon.title"),
        body: t("tour.ribbon.content"),
        onShow: async () => {
            setRibbonTab("transform");
        },
    },
    {
        target: '[data-tour="ribbon-transform"]',
        title: t("tour.transform.title"),
        body: t("tour.transform.content"),
        onShow: async () => {
            setRibbonTab("transform");
        },
    },
    {
        target: '[data-tour="custom-quick-action"]',
        title: t("tour.customQuickAction.title"),
        body: t("tour.customQuickAction.contentWithLink", {
            link: `<a href="${t("tour.customQuickAction.linkUrl")}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-600 font-medium">${t("tour.customQuickAction.linkText")}</a>`,
        }),
        onShow: async () => {
            setRibbonTab("transform");
        },
    },
    {
        target: '[data-tour="text-editor"]',
        title: t("tour.editor.title"),
        body: t("tour.editor.content"),
        onPrev: async () => {
            await executeCommand(new ClearTextCommand());
        },
    },
    {
        target: '[data-tour="text-editor-toolpanel"]',
        title: t("tour.textEditorToolpanel.title"),
        body: t("tour.textEditorToolpanel.content"),
        popperConfig: { placement: "top" },
    },
    {
        target: '[data-tour="word-count"]',
        title: t("tour.wordCount.title"),
        body: t("tour.wordCount.content"),
        popperConfig: { placement: "top" },
        onShow: async () => {
            await executeCommand(new ShowTextStatsCommand());
        },
        onNext: async () => {
            await executeCommand(new HideTextStatsCommand());
        },
        onPrev: async () => {
            await executeCommand(new HideTextStatsCommand());
        },
    },
    {
        target: '[data-tour="diff-review"]',
        title: t("tour.diffReview.title"),
        body: t("tour.diffReview.content"),
        popperConfig: { placement: "top" },
        onShow: async () => {
            // Populate the editor then run an example action so the diff
            // review (which replaces the editor) has content to point at.
            await executeCommand(new ClearTextCommand());
            await executeCommand(
                new ApplyTextCommand(exampleText, { from: 0, to: 0 }),
            );
            await runExampleQuickAction();
        },
    },
    {
        target: '[data-tour="ribbon-validate"]',
        title: t("tour.validate.title"),
        body: t("tour.validate.content"),
        onShow: async () => {
            setRibbonTab("validate");
        },
        onPrev: async () => {
            setRibbonTab("transform");
        },
    },
    {
        target: '[data-tour="start-tour"]',
        title: t("tour.conclusion.title"),
        body: t("tour.conclusion.content"),
        onShow: async () => {
            setRibbonTab("transform");
        },
    },
] as TourStep[];

// life cycle
onMounted(async () => {
    await nextTick();

    // Auto-start tour for first-time users (delay to ensure UI is ready)
    if (!tourCompleted.value) {
        startTour();
    }
});

onCommand<RestartTourCommand>(Cmds.RestartTourCommand, async () => {
    tour.value?.resetTour();
    startTour();
});

onUnmounted(() => {
    if (tourIsActive.value) {
        window.removeEventListener("keydown", handleKeyboardNavigation);
    }
});

const skipBtn: ButtonProp = {
    label: t("tour.skip"),
    leftIcon: "lucide:chevron-last",
};
const nextBtn: ButtonProp = {
    label: t("tour.next"),
    rightIcon: "lucide:arrow-big-right",
};
const prevButton: ButtonProp = {
    label: t("tour.prev"),
    leftIcon: "lucide:arrow-big-left",
};
const finishButton: ButtonProp = {
    label: t("tour.finish"),
    rightIcon: "lucide:check",
};
</script>

<template>
    <VTour
        ref="tour"
        :steps="steps"
        @onTourStart="onTourStart"
        @onTourEnd="onTourComplete"
        @skip="
            () => {
                onTourComplete();
            }
        "
        :highlight="true"
        :jumpOptions="{ duration: 10 }"
        :skip-button="skipBtn"
        :next-button="nextBtn"
        :prev-button="prevButton"
        :finish-button="finishButton"
        :trap-focus="trapFocus"
    />

    <div
        class="absolute bg-gray-500 z-99 inset-0 opacity-30"
        v-if="tourIsActive"
    ></div>
</template>

<style scoped>
@reference "../assets/css/main.css";

:deep(#nt-tooltip) {
    max-width: 450px;
}

:deep(#nt-action-next) {
    @apply bg-primary text-white;
}

:deep(#nt-action-prev) {
    @apply bg-primary text-white;
}

:deep(#nt-action-finish) {
    @apply bg-success text-white;
}
</style>
