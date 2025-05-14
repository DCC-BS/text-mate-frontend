<script setup lang="ts">
import {
    Cmds,
    InvalidateCorrectionCommand,
    type SwitchCorrectionLanguageCommand,
    type ToggleLockEditorCommand,
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
    Cmds.ToggleLockEditorCommand,
    async (command: ToggleLockEditorCommand) => {
        isEditorLocked.value = command.locked;

        if (!command.locked) {
            taskScheduler.schedule((signal: AbortSignal) =>
                correctText(userText.value, signal),
            );
        }
    },
);

async function handleInvalidate(_: InvalidateCorrectionCommand) {
    await correctionService.invalidateAll();
    taskScheduler.schedule((signal: AbortSignal) =>
        correctText(userText.value, signal),
    );
}
</script>

<template>
    <div class="h-[90vh]">
        <SplitView :is-horizontal="viewport.isLessThan('md')" a-pane-style="min-w-[250px] min-h-[200px]"
            b-pane-style="min-w-[300px] min-h-[200px]">
            <template #a>
                <client-only>
                    <div class="w-full h-full relative">
                        <TextEditor v-model="userText" v-model:selectedText="selectedText" />
                    </div>
                </client-only>
            </template>
            <template #b>
                <div>
                    <ToolPanel :text="userText" :selectedText="selectedText" />
                </div>
            </template>
        </SplitView>
    </div>
    <div class="fixed bottom-5 left-0 right-0">
        <ProgressIndication />
    </div>
</template>
