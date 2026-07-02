<script lang="ts" setup>
import { UTooltip } from "#components";
import {
    Cmds,
    type HideTextStatsCommand,
    RedoCommand,
    type ShowTextStatsCommand,
    UndoCommand,
    type UndoRedoStateChanged,
} from "~/assets/models/commands";
import TextStatsView from "../tool-panel/TextStatsView.vue";

const props = defineProps<{
    text: string;
    characters: number;
    words: number;
    limit: number;
    /** When true, mutating actions (undo/redo/upload) are disabled. */
    readonly?: boolean;
}>();

const emit = defineEmits<(e: "upload-file") => void>();

const { executeCommand, onCommand } = useCommandBus();
const { t } = useI18n();
const toast = useToast();
const undoRedoState = reactive({
    canUndo: false,
    canRedo: false,
});

// State to control the popover
const isStatsPopoverOpen = ref(false);

const copySuccess = ref(false);

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

async function copyToClipboard(): Promise<void> {
    if (!props.text || !import.meta.client) {
        return;
    }

    try {
        await navigator.clipboard.writeText(props.text);
        copySuccess.value = true;
        setTimeout(() => {
            copySuccess.value = false;
        }, 2000);
        toast.add({
            title: t("toolbar.copySuccess"),
            color: "success",
            icon: "i-lucide-check-circle",
            duration: 2000,
        });
    } catch {
        toast.add({
            title: t("toolbar.copyFailed"),
            color: "error",
            icon: "i-lucide-alert-circle",
            duration: 3000,
        });
    }
}

async function downloadWord(): Promise<void> {
    if (!props.text || !import.meta.client) {
        return;
    }

    try {
        const filename = `textmate-${new Date().toISOString().slice(0, 10)}.docx`;
        const blob = await markdownToDocx(props.text);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.add({
            title: t("toolbar.downloadSuccess"),
            description: filename,
            color: "success",
            icon: "i-lucide-check-circle",
            duration: 3000,
        });
    } catch {
        toast.add({
            title: t("toolbar.downloadFailed"),
            color: "error",
            icon: "i-lucide-alert-circle",
            duration: 3000,
        });
    }
}
</script>

<template>
    <div class="flex justify-between">
        <div data-tour="text-editor-toolpanel">
            <UTooltip :text="t('navigation.undo')" :kbds="['Ctrl', 'Z']">
                <UButton
                    icon="i-lucide-undo"
                    variant="link"
                    color="neutral"
                    :disabled="readonly || !undoRedoState.canUndo"
                    data-testid="undo-button"
                    @click="handleUndo"
                />
            </UTooltip>
            <UTooltip :text="t('navigation.redo')" :kbds="['Ctrl', 'Y']">
                <UButton
                    icon="i-lucide-redo"
                    variant="link"
                    color="neutral"
                    :disabled="readonly || !undoRedoState.canRedo"
                    data-testid="redo-button"
                    @click="handleRedo"
                />
            </UTooltip>
            <UTooltip :text="t('upload.uploadFile')">
                <UButton
                    icon="i-lucide-upload"
                    variant="link"
                    color="neutral"
                    :disabled="readonly"
                    @click="emit('upload-file')"
                />
            </UTooltip>
            <UTooltip :text="t('toolbar.copyToClipboard')">
                <UButton
                    :icon="
                        copySuccess ? 'i-lucide-check' : 'i-lucide-clipboard'
                    "
                    variant="link"
                    :color="copySuccess ? 'success' : 'neutral'"
                    :disabled="!props.text"
                    data-testid="copyToClipboardButton"
                    @click="copyToClipboard"
                />
            </UTooltip>
            <UTooltip :text="t('toolbar.downloadWord')">
                <UButton
                    icon="i-lucide-download"
                    variant="link"
                    color="neutral"
                    :disabled="!props.text"
                    data-testid="downloadWordButton"
                    @click="downloadWord"
                />
            </UTooltip>
        </div>

        <UPopover v-model:open="isStatsPopoverOpen" data-tour="word-count">
            <UButton
                class="text-gray-500"
                variant="link"
                color="neutral"
                data-testid="characterCountButton"
            >
                {{ props.characters }}
                / {{ props.limit }} Zeichen
            </UButton>

            <template #content>
                <TextStatsView :text="props.text" class="w-[300px]" />
            </template>
        </UPopover>
    </div>
</template>
