<script lang="ts" setup>
import type { TabsItem } from "@nuxt/ui";
import { UTabs } from "#components";
import {
    Cmds,
    type RewriteTextCommand,
    ToolSwitchCommand,
} from "~/assets/models/commands";
import AdvisorView from "./tool-panel/advisor-view.vue";
import ComparePanel from "./tool-panel/compare-panel.vue";
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
const { registerHandler, unregisterHandler, executeCommand } = useCommandBus();

// refs
const selectedTab = ref("0");
const formality = ref<string>("neutral");
const domain = ref<string>("general");

onMounted(() => {
    registerHandler(Cmds.RewriteTextCommand, handleRewriteText);
});

onUnmounted(() => {
    unregisterHandler(Cmds.RewriteTextCommand, handleRewriteText);
});

watch(
    () => selectedTab.value,
    (tab) => {
        switch (tab) {
            case "0":
                executeCommand(new ToolSwitchCommand("correction"));
                break;
            case "1":
                executeCommand(new ToolSwitchCommand("rewrite"));
                break;
            case "2":
                executeCommand(new ToolSwitchCommand("advisor"));
                break;
            default:
        }
    },
);

const items = [
    {
        slot: "problems",
        label: t("tools.problems"),
        icon: "i-heroicons-bolt",
    },
    {
        slot: "rewrite",
        label: t("tools.rewrite"),
        icon: "i-heroicons-arrow-path-rounded-square-16-solid",
    },
    {
        slot: "advisor",
        label: t("tools.advisor"),
        icon: "i-heroicons-light-bulb",
    },
    // {
    //     slot: "compare",
    //     label: t("tools.compare"),
    //     icon: "i-lucide-git-compare-arrows",
    // },
] as TabsItem[];

async function handleRewriteText(_: RewriteTextCommand): Promise<void> {
    selectedTab.value = "1";
}
</script>

<template>
    <div class="h-full p-2">
        <!-- wrapper: 'h-[30vh] md:h-[90vh]'             -->
        <UTabs
            v-model="selectedTab"
            :items="items"
            class="h-full"
            :unmountOnHide="false"
            :ui="{ content: 'h-[30vh] md:h-[80vh] overflow-y-auto scrollable-container' }"> 
            <template #problems>
                <ProblemsPanel />
            </template>
            <template #rewrite>
                <div class="h-full">
                    <RewriteView 
                        :text="props.text"
                        :selectedText="props.selectedText" />
                </div>
            </template>
            <template #advisor>
                <AdvisorView :text="props.text" />
            </template>
            <template #compare>
                <ComparePanel :text="props.text" />
            </template>
        </UTabs>
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
