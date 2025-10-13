<script lang="ts" setup>
import { AnimatePresence, motion } from "motion-v";
import {
    Cmds,
    type RewriteTextCommand,
    type ToolSwitchCommand,
} from "~/assets/models/commands";
import AdvisorView from "./tool-panel/advisor-view.vue";
import ProblemsPanel from "./tool-panel/problems-panel.vue";
import RewriteView from "./tool-panel/rewrite-view.vue";

// definitions
interface ToolPanelProps {
    text: string;
    selectedText?: TextFocus;
}

const props = defineProps<ToolPanelProps>();

// composables
const { t } = useI18n();
const { onCommand } = useCommandBus();

// refs
const selectedTab = ref("0");
const selectedTool = ref<"correction" | "rewrite" | "advisor">("correction");

// animations
const initial = { opacity: 0, y: -20 };
const animate = { opacity: 1, y: 0 };
const exit = { opacity: 0, y: 20 };

onCommand<ToolSwitchCommand>(Cmds.ToolSwitchCommand, async (command) => {
    selectedTool.value = command.tool;
});

onCommand<RewriteTextCommand>(Cmds.RewriteTextCommand, async (_) => {
    selectedTab.value = "1";
});
</script>

<template>
    <div class="h-full p-2">
        <AnimatePresence>
            <motion.div data-tour="problems" :initial="initial" :animate="animate" :exit="exit" mode="popLayout"
                v-show="selectedTool === 'correction'" class="h-full relative">
                <ProblemsPanel :text="props.text" />
            </motion.div>
            <motion.div data-tour="rewrite" :initial="initial" :animate="animate" :exit="exit" mode="popLayout"
                v-show="selectedTool === 'rewrite'" class="h-full relative">
                <RewriteView :text="props.text" />
            </motion.div>
            <motion.div data-tour="advisor" :initial="initial" :animate="animate" :exit="exit" mode="popLayout"
                v-show="selectedTool === 'advisor'" class="h-full relative">
                <AdvisorView :text="props.text" />
            </motion.div>
        </AnimatePresence>
    </div>
</template>

<style scoped>
.tool-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 1px solid #e0e0e0;
}
</style>
