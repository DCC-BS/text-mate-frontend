<script lang="ts" setup>
import { UTooltip } from "#components";
import {
    Cmds,
    RedoCommand,
    UndoCommand,
    type UndoRedoStateChanged,
} from "~/assets/models/commands";
import TextStatsView from "../tool-panel/text-stats-view.vue";

const props = defineProps<{
    text: string;
    characters: number;
    words: number;
    limit: number;
}>();

const emit = defineEmits<(e: "upload-file") => void>();

const { executeCommand, onCommand } = useCommandBus();
const { t } = useI18n();
const undoRedoState = reactive({
    canUndo: false,
    canRedo: false,
});

onCommand<UndoRedoStateChanged>(Cmds.UndoRedoStateChanged, async (command) => {
    undoRedoState.canUndo = command.canUndo;
    undoRedoState.canRedo = command.canRedo;
});

function handleUndo(): void {
    executeCommand(new UndoCommand());
}

function handleRedo(): void {
    executeCommand(new RedoCommand());
}
</script>

<template>
  <div class="flex justify-between">
    <div>
      <UTooltip :text="t('navigation.undo')" :kbds="['Ctrl', 'Z']">
        <UButton icon="i-lucide-undo" variant="link" color="neutral" @click="handleUndo"
          :disabled="!undoRedoState.canUndo"></UButton>
      </UTooltip>
      <UTooltip :text="t('navigation.redo')" :kbds="['Ctrl', 'Y']">
        <UButton icon="i-lucide-redo" variant="link" color="neutral" @click="handleRedo"
          :disabled="!undoRedoState.canRedo"></UButton>
      </UTooltip>
      <UTooltip :text="t('upload.uploadFile')">
        <UButton icon="i-lucide-upload" variant="link" color="neutral" @click="emit('upload-file')"></UButton>
      </UTooltip>
    </div>

    <UPopover>
      <UButton class="text-gray-500" variant="link" color="neutral">
        {{ props.characters }} / {{ props.limit }} Zeichen
      </UButton>

      <template #content>
        <TextStatsView :text="props.text" class="w-[300px]" />
      </template>
    </UPopover>
  </div>
</template>