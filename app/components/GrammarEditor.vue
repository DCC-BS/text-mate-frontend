<script setup lang="ts">
import { AnimatePresence, motion } from "motion-v";
import {
    Cmds,
    InvalidateCorrectionCommand,
    type SwitchCorrectionLanguageCommand,
    type ToggleEditableEditorCommand,
    type ToggleLockEditorCommand,
    type ToolSwitchCommand,
} from "~/assets/models/commands";
import { TaskScheduler } from "~/assets/services/TaskScheduler";
import TextEditor from "./TextEditor.vue";
import ToolPanel from "./ToolPanel.vue";

// refs
const userText = ref("");
const taskScheduler = new TaskScheduler();
const selectedText = ref<TextFocus>();
const isEditorLocked = ref(false);
const isCorrectionSuspended = ref(false);

const currentTool = ref<"correction" | "rewrite" | "advisor">("rewrite");
const tourIsActive = ref(false);

// composables
const router = useRouter();
const { addProgress, removeProgress } = useUseProgressIndication();
const { t } = useI18n();
const { onCommand } = useCommandBus();

const correctionService = useCorrectionService();

// check if the query param clipboard is true
const clipboard = router.currentRoute.value.query.clipboard;

// life cycle
onMounted(async () => {
    // Wait for next tick to ensure text editor is fully mounted
    await nextTick();

    if (clipboard && userText.value === "") {
        const text = await navigator.clipboard.readText();
        userText.value = text;
    }
});

// listeners
watch(userText, (newText, oldText) => {
    if (newText === oldText) {
        return;
    }

    // Do not trigger corrections while quick actions or other editor locks are active
    if (isCorrectionSuspended.value) {
        return;
    }

    if (currentTool.value === "correction") {
        taskScheduler.schedule((signal: AbortSignal) =>
            correctText(newText, signal),
        );
    }

    // ends with any whitespace
    if (newText.endsWith(".") || newText.endsWith("\n")) {
        taskScheduler.executeImmediately();
    }
});

watch(currentTool, () => {
    // When switching to correction tool, run correction on current text
    if (currentTool.value === "correction") {
        taskScheduler.schedule((signal: AbortSignal) =>
            correctText(userText.value, signal),
        );
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

// Suspend automatic corrections while the editor is locked by quick actions
onCommand<ToggleLockEditorCommand>(
    Cmds.ToggleLockEditorCommand,
    async (command: ToggleLockEditorCommand) => {
        isCorrectionSuspended.value = command.locked;

        if (command.locked) {
            // Abort any running correction task to keep the UI responsive
            taskScheduler.abortRunningTask();
            return;
        }

        // When unlocking, run a single correction pass for the final text
        taskScheduler.schedule((signal: AbortSignal) =>
            correctText(userText.value, signal),
        );
    },
);

async function handleInvalidate(_: InvalidateCorrectionCommand) {
    taskScheduler.abortRunningTask();
    await correctionService.invalidateAll();
    taskScheduler.schedule((signal: AbortSignal) =>
        correctText(userText.value, signal),
    );
}
</script>

<template>
    <div class="p-2 w-full h-full">
        <SplitContainer>
            <template #header>
                <div class="flex items-center w-full flex-1">
                    <div class="flex-1"></div>
                    <ToolSelectView class="flex-1" />
                    <OptionsBar class="flex-1" />
                </div>

                <AnimatePresence>
                    <motion.div
                        data-allow-mismatch
                        v-show="currentTool === 'rewrite'"
                        class="quick-action-panel overflow-hidden"
                        :layout="true"
                        :initial="{ height: 0, opacity: 0 }"
                        :animate="{ height: 'auto', opacity: 1 }"
                        :exit="{ height: 0, opacity: 0 }"
                        :transition="{
                            height: {
                                type: 'spring',
                                stiffness: 300,
                                damping: 30,
                            },
                            opacity: { duration: 0.2 },
                        }"
                    />
                </AnimatePresence>
            </template>

            <template #left>
                <div class="w-full md:h-full relative h-[400px]">
                    <TextEditor
                        v-model="userText"
                        v-model:selectedText="selectedText"
                    />
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
