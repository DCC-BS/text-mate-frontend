<script setup lang="ts">
import {
    Cmds,
    InvalidateCorrectionCommand,
    type SwitchCorrectionLanguageCommand,
    type ToggleEditableEditorCommand,
} from "~/assets/models/commands";
import { TaskScheduler } from "~/assets/services/TaskScheduler";
import TextEditor from "./text-editor.vue";
import ToolPanel from "./tool-panel.vue";

// refs
const userText = ref("");
const taskScheduler = new TaskScheduler();
const selectedText = ref<TextFocus>();
const isEditorLocked = ref(false);

// composables
const router = useRouter();
const viewport = useViewport();
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
        icon: "i-heroicons-pencil",
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

async function handleInvalidate(_: InvalidateCorrectionCommand) {
    taskScheduler.abortRunningTask();
    await correctionService.invalidateAll();
    taskScheduler.schedule((signal: AbortSignal) =>
        correctText(userText.value, signal),
    );
}
</script>

<template>
    <SplitContainer>
        <template #header>
            <div class="flex items-center w-full">
                <div class="flex-1"></div>
                <ToolSelectView class="flex-1"/>
                <OptionsBar class="flex-1"/>
            </div>
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

    <DataBsFooter></DataBsFooter>

    <div class="fixed bottom-5 left-0 right-0">
        <ProgressIndication />
    </div>
</template>
