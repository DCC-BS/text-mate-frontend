<script setup lang="ts">
import { AnimatePresence, motion } from "motion-v";
import {
    Cmds,
    InvalidateCorrectionCommand,
    type SwitchCorrectionLanguageCommand,
    type ToggleEditableEditorCommand,
    type ToolSwitchCommand,
} from "~/assets/models/commands";
import { TaskScheduler } from "~/assets/services/TaskScheduler";
import TextEditor from "./text-editor.vue";
import ToolPanel from "./tool-panel.vue";
import type { TourStep } from "#nuxt-tour/props";
import { VTour } from "#components";

// refs
const userText = ref("");
const taskScheduler = new TaskScheduler();
const selectedText = ref<TextFocus>();
const isEditorLocked = ref(false);

const currentTool = ref<"correction" | "rewrite" | "advisor">("correction");
const tourIsActive = ref(false);
const tour = ref<InstanceType<typeof VTour>>();

// composables
const router = useRouter();
const { addProgress, removeProgress } = useUseProgressIndication();
const { t } = useI18n();
const { onCommand } = useCommandBus();

// Tour state
const tourCompleted = useCookie("tour-completed", { default: () => false });
const showTour = ref(false);

// Tour steps for onboarding
const steps = [
    {
        target: '[data-tour="tool-switch"]',
        title: t("tour.welcome.title"),
        body: t("tour.welcome.content"),
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
    },
    {
        target: '[data-tour="text-editor"]',
        title: t("tour.editor.title"),
        body: t("tour.editor.content"),
    },
    {
        target: '[data-tour="word-count"]',
        title: t("tour.wordCount.title"),
        body: t("tour.wordCount.content"),
        beforeEnter: async () => {
            // Switch to correction tool if not already active
            if (currentTool.value !== "correction") {
                currentTool.value = "correction";
                // Wait a bit for the UI to update
                await new Promise((resolve) => setTimeout(resolve, 300));
            }
        },
    },
] as TourStep[];

// Tour control functions
function startTour(): void {
    showTour.value = true;
}

function onTourStart(): void {
    tourIsActive.value = true;
}

function onTourComplete(): void {
    tourCompleted.value = true;
    tourIsActive.value = false;
}

// Expose startTour method for parent component
defineExpose({
    startTour,
});

const correctionService = useCorrectionService();

// check if the query param clipboard is true
const clipboard = router.currentRoute.value.query.clipboard;

// life cycle
onMounted(async () => {
    tour.value?.resetTour();

    // Wait for next tick to ensure text editor is fully mounted
    await nextTick();

    if (clipboard && userText.value === "") {
        const text = await navigator.clipboard.readText();
        userText.value = text;
    }

    // Auto-start tour for first-time users (delay to ensure UI is ready)
    if (!tourCompleted.value) {
        setTimeout(() => {
            startTour();
        }, 1000);
    }
});

// listeners
watch(userText, (newText, oldText) => {
    if (newText === oldText) {
        return;
    }

    taskScheduler.schedule((signal: AbortSignal) =>
        correctText(newText, signal),
    );

    // ends with any whitespace
    if (newText.endsWith(".") || newText.endsWith("\n")) {
        taskScheduler.executeImmediately();
    }
});

// functions
async function correctText(text: string, signal: AbortSignal) {
    addProgress("correcting", {
        icon: "i-lucide-pencil",
        title: t("status.correctingText"),
    });
    try {
        await correctionService.correctText(text, signal);
    } finally {
        removeProgress("correcting");
    }
}

onCommand(
    Cmds.SwitchCorrectionLanguageCommand,
    async (command: SwitchCorrectionLanguageCommand) => {
        correctionService.switchLanguage(command.language);
        await handleInvalidate(new InvalidateCorrectionCommand());
    },
);

onCommand(Cmds.InvalidateCorrectionCommand, handleInvalidate);

onCommand(
    Cmds.ToggleEditableEditorCommand,
    async (command: ToggleEditableEditorCommand) => {
        isEditorLocked.value = command.locked;

        if (!command.locked) {
            taskScheduler.schedule((signal: AbortSignal) =>
                correctText(userText.value, signal),
            );
        }
    },
);

onCommand<ToolSwitchCommand>(Cmds.ToolSwitchCommand, async (cmd) => {
    currentTool.value = cmd.tool;
});

async function handleInvalidate(_: InvalidateCorrectionCommand) {
    taskScheduler.abortRunningTask();
    await correctionService.invalidateAll();
    taskScheduler.schedule((signal: AbortSignal) =>
        correctText(userText.value, signal),
    );
}
</script>

<template>
    <VTour ref="tour" :steps="steps" autoStart @onTourStart="onTourStart" @onTourEnd="onTourComplete"
        @skip="onTourComplete" :highlight="true" />

    <div class="absolute bg-gray-500 z-99 inset-0 opacity-30" v-if="tourIsActive"></div>

    <div class="p-2 w-full h-full">
        <SplitContainer>
            <template #header>
                <div class="flex items-center w-full flex-1">
                    <div class="flex-1"></div>
                    <ToolSelectView class="flex-1" />
                    <OptionsBar class="flex-1" />
                </div>

                <AnimatePresence>
                    <motion.div data-allow-mismatch v-show="currentTool === 'rewrite'" class="quick-action-panel"
                        :layout="true" :initial="{ height: 0, opacity: 0 }" :animate="{ height: 'auto', opacity: 1 }"
                        :exit="{ height: 0, opacity: 0 }" :transition="{
                            height: { type: 'spring', stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }" style="overflow: hidden;" />
                </AnimatePresence>
            </template>

            <template #left>
                <div class="w-full h-full relative">
                    <TextEditor v-model="userText" v-model:selectedText="selectedText" />
                </div>
            </template>

            <template #right>
                <ToolPanel :text="userText" :selectedText="selectedText" />
            </template>
        </SplitContainer>
    </div>


    <div class="fixed bottom-5 left-0 right-0">
        <ProgressIndication />
    </div>
</template>
