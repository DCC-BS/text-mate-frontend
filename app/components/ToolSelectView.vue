<script lang="ts" setup>
import { Cmds, ToolSwitchCommand } from "~/assets/models/commands";
import type { TextTools } from "~/types/TextTools";

const { t } = useI18n();

const { executeCommand, onCommand } = useCommandBus();

const activeTool = ref<TextTools>("rewrite");

function switchTool(tool: TextTools) {
    activeTool.value = tool;
}

watch(
    () => activeTool.value,
    (value) => {
        executeCommand(new ToolSwitchCommand(value));
    },
);

onCommand<ToolSwitchCommand>(Cmds.ToolSwitchCommand, async (command) => {
    if (activeTool.value === command.tool) {
        return;
    }
    activeTool.value = command.tool;
});
</script>

<template>
    <div class="flex gap-2 justify-center" data-tour="tool-switch">
        <UButton
            layout
            :variant="activeTool === 'rewrite' ? 'soft' : 'link'"
            :color="activeTool === 'rewrite' ? 'primary' : 'neutral'"
            @click="switchTool('rewrite')"
        >
            {{ t("tools.rewrite") }}
        </UButton>

        <UButton
            layout
            :variant="activeTool === 'advisor' ? 'soft' : 'link'"
            :color="activeTool === 'advisor' ? 'primary' : 'neutral'"
            @click="switchTool('advisor')"
        >
            {{ t("tools.advisor") }}
        </UButton>
    </div>
</template>
