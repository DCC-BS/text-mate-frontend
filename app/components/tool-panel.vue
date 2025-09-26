<script lang="ts" setup>
import {
    Cmds,
    type RewriteTextCommand,
    ToolSwitchCommand,
} from "~/assets/models/commands";
import AdvisorView from "./tool-panel/advisor-view.vue";
import ComparePanel from "./tool-panel/compare-panel.vue";
import RewriteView from "./tool-panel/rewrite-view.vue";
import ProblemsPanel from "./tool-panel/problems-panel.vue";
import { motion, AnimatePresence } from "motion-v";

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
            <motion.div :initial="initial" :animate="animate" :exit="exit" mode="popLayout" v-show="selectedTool === 'correction'" class="h-full">
                <ProblemsPanel :text="props.text" />
            </motion.div>
            <motion.div :initial="initial" :animate="animate" :exit="exit" mode="popLayout" v-show="selectedTool === 'rewrite'" class="h-full">
                <RewriteView :text="props.text" />
            </motion.div>
            <motion.div :initial="initial" :animate="animate" :exit="exit" mode="popLayout" v-show="selectedTool === 'advisor'" class="h-full">
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
