<script setup lang="ts">
import { AnimatePresence, motion } from "motion-v";
import {
    Cmds,
    type ToggleEditableEditorCommand,
    type ToggleLockEditorCommand,
    type ToolSwitchCommand,
} from "~/assets/models/commands";
import type { TextTools } from "~/types/TextTools";
import TextEditor from "./TextEditor.vue";
import ToolPanel from "./ToolPanel.vue";

// refs
const userText = ref("");
const selectedText = ref<TextFocus>();
const isEditorLocked = ref(false);

const currentTool = ref<TextTools>("rewrite");

// composables
const router = useRouter();
const { t } = useI18n();
const { onCommand } = useCommandBus();

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

onCommand(
    Cmds.ToggleEditableEditorCommand,
    async (command: ToggleEditableEditorCommand) => {
        isEditorLocked.value = command.locked;
    },
);

onCommand<ToolSwitchCommand>(Cmds.ToolSwitchCommand, async (cmd) => {
    currentTool.value = cmd.tool;
});
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

    <div class="fixed bottom-5 left-0 right-0"><ProgressIndication /></div>
</template>
