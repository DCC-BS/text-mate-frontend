<script lang="ts" setup>
import { UTooltip } from "#components";
import {
  Cmds,
  RedoCommand,
  UndoCommand,
  type UndoRedoStateChanged,
  type ShowTextStatsCommand,
  type HideTextStatsCommand,
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

// State to control the popover
const isStatsPopoverOpen = ref(false);

onCommand<UndoRedoStateChanged>(Cmds.UndoRedoStateChanged, async (command) => {
  undoRedoState.canUndo = command.canUndo;
  undoRedoState.canRedo = command.canRedo;
});

// Listen for the ShowTextStatsCommand to open the popover
onCommand<ShowTextStatsCommand>(Cmds.ShowTextStatsCommand, async () => {
  isStatsPopoverOpen.value = true;
});

// Listen for the HideTextStatsCommand to close the popover
onCommand<HideTextStatsCommand>(Cmds.HideTextStatsCommand, async () => {
  isStatsPopoverOpen.value = false;
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
    <div data-tour="text-editor-toolpanel">
      <UTooltip :text="t('navigation.undo')" :kbds="['Ctrl', 'Z']">
        <UButton icon="i-lucide-undo" variant="link" color="neutral" @click="handleUndo"
          :disabled="!undoRedoState.canUndo" data-testid="undo-button"></UButton>
      </UTooltip>
      <UTooltip :text="t('navigation.redo')" :kbds="['Ctrl', 'Y']">
        <UButton icon="i-lucide-redo" variant="link" color="neutral" @click="handleRedo"
          :disabled="!undoRedoState.canRedo" data-testid="redo-button"></UButton>
      </UTooltip>
      <UTooltip :text="t('upload.uploadFile')">
        <UButton icon="i-lucide-upload" variant="link" color="neutral" @click="emit('upload-file')"></UButton>
      </UTooltip>
    </div>

    <UPopover v-model:open="isStatsPopoverOpen" data-tour="word-count">
      <UButton class="text-gray-500" variant="link" color="neutral" data-testid="characterCountButton">
        {{ props.characters }} / {{ props.limit }} Zeichen
      </UButton>

      <template #content>
        <TextStatsView :text="props.text" class="w-[300px]" />
      </template>
    </UPopover>
  </div>
</template>