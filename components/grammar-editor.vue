<script setup lang="ts">
import { CorrectionService } from "~/assets/services/CorrectionService";
import { TaskScheduler } from "~/assets/services/TaskScheduler";
import TextEditor from "./text-editor.vue";
import ToolPanel from "./tool-panel.vue";
import {
    Cmds,
    InvalidateCorrectionCommand,
    type SwitchCorrectionLanguageCommand,
} from "~/assets/models/commands";
import { useUserDictionaryStore } from "~/stores/user_dictionary";

// refs
const userText = ref("");
const taskScheduler = new TaskScheduler();
const selectedText = ref<TextFocus>();

// composables
const router = useRouter();
const viewport = useViewport();
const { addProgress, removeProgress } = useUseProgressIndication();
const { t } = useI18n();
const { executeCommand, registerHandler, unregisterHandler } = useCommandBus();
const { sendError } = useUseErrorDialog();
const logger = useLogger();
const userDictStore = useUserDictionaryStore();

// todo create a composable
const correctionService = new CorrectionService(
    logger,
    executeCommand,
    userDictStore.exists,
    sendError,
);

// check if the query param clipboard is true
const clipboard = router.currentRoute.value.query.clipboard;

// life cycle
onMounted(async () => {
    registerHandler(Cmds.SwitchCorrectionLanguageCommand, handleSwitchLanguage);
    registerHandler(Cmds.InvalidateCorrectionCommand, handleInvalidate);

    // Wait for next tick to ensure text editor is fully mounted
    await nextTick();

    if (clipboard && userText.value === "") {
        const text = await navigator.clipboard.readText();
        userText.value = text;
    }
});

onUnmounted(() => {
    unregisterHandler(
        Cmds.SwitchCorrectionLanguageCommand,
        handleSwitchLanguage,
    );
    unregisterHandler(Cmds.InvalidateCorrectionCommand, handleInvalidate);
});

// listeners
watch(userText, (newText) => {
    taskScheduler.schedule((signal: AbortSignal) =>
        correctText(newText, signal),
    );

    // ends with any whitespace
    if (newText.endsWith(" ") || newText.endsWith("\n")) {
        taskScheduler.executeImmediately();
    }
});

// functions
async function correctText(
    text: string,
    signal: AbortSignal,
    invalidate = true,
) {
    addProgress("correcting", {
        icon: "i-heroicons-pencil",
        title: t("status.correctingText"),
    });
    try {
        await correctionService.correctText(text, signal, invalidate);
    } finally {
        removeProgress("correcting");
    }
}

async function handleSwitchLanguage(command: SwitchCorrectionLanguageCommand) {
    correctionService.switchLanguage(command.language);

    await handleInvalidate(new InvalidateCorrectionCommand());
}

async function handleInvalidate(command: InvalidateCorrectionCommand) {
    taskScheduler.schedule((signal: AbortSignal) =>
        correctText(userText.value, signal, true),
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
