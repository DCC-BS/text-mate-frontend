<script setup lang="ts">
import { AnimatePresence, motion } from "motion-v";
import { AdvisorMain } from "#components";
import { Cmds, type ToolSwitchCommand } from "~/assets/models/commands";
import type { TextTools } from "~/types/TextTools";

// refs
const userText = ref("");
const selectedText = ref<TextFocus>();

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

onCommand<ToolSwitchCommand>(Cmds.ToolSwitchCommand, async (cmd) => {
    currentTool.value = cmd.tool;
});
</script>

<template>
    <div class="p-2 w-full md:h-full">
        <div
            class="h-full w-full shadow-[2px_2px_1px_1px_#0000000D] ring-1 ring-default rounded-md flex flex-col"
        >
            <div class="border-b-1 border-default p-4">
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
            </div>

            <div
                class="grow overflow-hidden flex flex-col md:flex-row justify-stretch items-stretch"
            >
                <RewriteMain
                    v-if="currentTool === 'rewrite'"
                    v-model="userText"
                    :selectedText="selectedText"
                />

                <AdvisorMain v-else v-model="userText" />
            </div>
        </div>
    </div>

    <div class="fixed bottom-5 left-0 right-0"><ProgressIndication /></div>
</template>
