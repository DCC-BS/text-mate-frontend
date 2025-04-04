<script lang="ts" setup>
import { Cmds, type RewriteTextCommand } from "~/assets/models/commands";
import type { TextCorrectionBlock } from "~/assets/models/text-correction";
import { UTabs } from "#components";

// definitions
interface ToolPanelProps {
    text: string;
    blocks: TextCorrectionBlock[];
}

const props = defineProps<ToolPanelProps>();

// composables
const { t } = useI18n();
const { registerHandler, unregisterHandler } = useCommandBus();

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
];

async function handleRewriteText(_: RewriteTextCommand): Promise<void> {
    selectedTab.value = "1";
}
</script>

<template>
    <div class="h-full p-2">
        <!-- wrapper: 'h-[30vh] md:h-[90vh]'             -->
        <UTabs
            v-model="selectedTab" :items="items" class="h-full"
            :ui="{ content: 'h-[30vh] md:h-[90vh] overflow-y-auto scrollable-container' }"> 
            <template #problems>
                <ProblemsPanel :blocks="props.blocks" />
            </template>
            <template #rewrite>
                <div class="h-full">
                    <RewriteView :formality="formality" :domain="domain" />
                </div>
            </template>
            <template #advisor>
                <AdvisorView :domain="domain" :formality="formality" :text="props.text" />
            </template>
        </UTabs>
    </div>
</template>



<style lang="scss" scoped>
.tool-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 1px solid #e0e0e0;
}
</style>
