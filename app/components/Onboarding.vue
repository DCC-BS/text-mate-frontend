<script lang="ts" setup>
import type { VTour } from "#components";
import type { ButtonProp, TourStep } from "#nuxt-tour/props";
import {
    ApplyTextCommand,
    ClearTextCommand,
    Cmds,
    ExecuteTextActionCommand,
    HideTextStatsCommand,
    RegisterDiffCommand,
    type RestartTourCommand,
    ShowTextStatsCommand,
    ToolSwitchCommand,
} from "~/assets/models/commands";

const exampleText = "Schreibe hier dein text.";
const exampleRewriteText = "Dein umformulierte Text.";

const { t } = useI18n();
const { executeCommand, onCommand } = useCommandBus();

const tour = ref<InstanceType<typeof VTour>>();

// Tour state
const tourCompleted = useCookie("tour-completed", { default: () => false });
const showTour = ref(false);
const tourIsActive = ref(false);
const trapFocus = ref(false);

// Tour control functions
function startTour(): void {
    showTour.value = true;
    tour.value?.startTour();
}

function onTourStart(): void {
    tourIsActive.value = true;
    // Add keyboard navigation when tour starts
    window.addEventListener("keydown", handleKeyboardNavigation);
}

async function onTourComplete(): Promise<void> {
    tourCompleted.value = true;
    tourIsActive.value = false;
    // Remove keyboard navigation when tour ends
    window.removeEventListener("keydown", handleKeyboardNavigation);
    await executeCommand(new ClearTextCommand());
    await executeCommand(new ToolSwitchCommand("correction"));
    await executeCommand(new RegisterDiffCommand("", ""));
}

// Keyboard navigation handler
function handleKeyboardNavigation(event: KeyboardEvent): void {
    if (!tourIsActive.value) return;

    // Check if user is typing in an input field
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

// Tour steps for onboarding
const steps = [
    {
        title: t("tour.welcome.title"),
        body: t("tour.welcome.content"),
    },
    {
        target: '[data-tour="tool-switch"]',
        title: t("tour.functions.title"),
        body: t("tour.functions.content"),
        onShow: async () => {
            await executeCommand(new ToolSwitchCommand("rewrite"));
        },
        onNext: async () => {
            // also switch tool on next because the user might change tool before clicking next
            await executeCommand(new ToolSwitchCommand("rewrite"));
        },
        onPrev: async () => {
            await executeCommand(new ToolSwitchCommand("correction"));
        },
    },
    {
        target: '[data-tour="custom-quick-action"]',
        title: t("tour.customQuickAction.title"),
        body: t("tour.customQuickAction.contentWithLink", {
            link: `<a href="${t("tour.customQuickAction.linkUrl")}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-600 font-medium">${t("tour.customQuickAction.linkText")}</a>`,
        }),
        onShow: async () => {
            await executeCommand(new ToolSwitchCommand("rewrite"));
        },
        onNext: async () => {
            // also switch tool on next because the user might change tool before clicking next
            await executeCommand(new ToolSwitchCommand("rewrite"));
        },
    },
    {
        target: '[data-tour="rewrite"]',
        title: t("tour.rewrite.title"),
        body: t("tour.rewrite.content"),
    },
    {
        target: '[data-tour="rewrite-toolpanel"]',
        title: t("tour.rewriteToolpanel.title"),
        body: t("tour.rewriteToolpanel.content"),
        popperConfig: {
            placement: "top",
        },
    },
    {
        target: '[data-tour="tool-switch"]',
        title: t("tour.problemsIntro.title"),
        body: t("tour.problemsIntro.content"),
        onShow: async () => {
            await executeCommand(new ToolSwitchCommand("correction"));
        },
        onNext: async () => {
            await executeCommand(new ToolSwitchCommand("correction"));
        },
        onPrev: async () => {
            await executeCommand(new ToolSwitchCommand("rewrite"));
        },
    },
    {
        target: '[data-tour="language-select"]',
        title: t("tour.language.title"),
        body: t("tour.language.content"),
    },
    {
        target: '[data-tour="dictionary"]',
        title: t("tour.dictionary.title"),
        body: t("tour.dictionary.content"),
        onNext: async () => {
            await executeCommand(new ClearTextCommand());
            await executeCommand(
                new ApplyTextCommand(exampleText, { from: 0, to: 0 }),
            );
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
        target: '[data-tour="problems"]',
        title: t("tour.problems.title"),
        body: t("tour.problems.content"),
    },
    {
        target: '[data-tour="text-editor-toolpanel"]',
        title: t("tour.textEditorToolpanel.title"),
        body: t("tour.textEditorToolpanel.content"),
        popperConfig: {
            placement: "top",
        },
    },
    {
        target: '[data-tour="word-count"]',
        title: t("tour.wordCount.title"),
        body: t("tour.wordCount.content"),
        popperConfig: {
            placement: "top",
        },
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
        target: '[data-tour="tool-switch"]',
        title: t("tour.check.title"),
        body: t("tour.check.content"),
        onShow: async () => {
            await executeCommand(new ToolSwitchCommand("advisor"));
        },
        onNext: async () => {
            await executeCommand(new ToolSwitchCommand("advisor"));
        },
        onPrev: async () => {
            await executeCommand(new ToolSwitchCommand("rewrite"));
        },
    },

    {
        target: '[data-tour="advisor"]',
        title: t("tour.advisor.title"),
        body: t("tour.advisor.content"),
    },
    {
        target: '[data-tour="start-tour"]',
        title: t("tour.conclusion.title"),
        body: t("tour.conclusion.content"),
    },
] as TourStep[];

// life cycle
onMounted(async () => {
    // Wait for next tick to ensure text editor is fully mounted
    await nextTick();

    // Auto-start tour for first-time users (delay to ensure UI is ready)
    if (!tourCompleted.value) {
        startTour();
    }
});

onCommand<RestartTourCommand>(Cmds.RestartTourCommand, async (_) => {
    tour.value?.resetTour();
    startTour();
});

// Clean up keyboard listener on unmount
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
    <VTour ref="tour" :steps="steps" @onTourStart="onTourStart" @onTourEnd="onTourComplete"
        @skip="() => { onTourComplete() }" :highlight="true" :jumpOptions="{ duration: 10 }" :skip-button="skipBtn"
        :next-button="nextBtn" :prev-button="prevButton" :finish-button="finishButton" :trap-focus="trapFocus" />

    <div class="absolute bg-gray-500 z-99 inset-0 opacity-30" v-if="tourIsActive"></div>
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

:deep(#nt-action-skip) {}

:deep(#nt-action-finish) {
    @apply bg-success text-white;
}
</style>