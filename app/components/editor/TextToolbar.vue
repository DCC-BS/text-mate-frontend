<script setup lang="ts">
import { UTooltip } from "#components";
import {
    Cmds,
    type HideTextStatsCommand,
    RedoCommand,
    type ShowTextStatsCommand,
    UndoCommand,
    type UndoRedoStateChanged,
} from "~/assets/models/commands";
import { formatNumber } from "~/utils/formatNumber";
import TextStatsView from "../tool-panel/TextStatsView.vue";

const props = defineProps<{
    text: string;
    characters: number;
    words: number;
    limit: number;
    /** When true, mutating actions (undo/redo/upload) are disabled. */
    readonly?: boolean;
}>();

const emit = defineEmits<(e: "upload-file" | "capture-photo") => void>();

const { executeCommand, onCommand } = useCommandBus();
const { t } = useI18n();
const toast = useToast();

/** Camera capture needs the MediaDevices API; hidden when unavailable. */
const isCaptureSupported = computed(
    () => import.meta.client && Boolean(navigator.mediaDevices?.getUserMedia),
);
const undoRedoState = reactive({
    canUndo: false,
    canRedo: false,
});

/**
 * Touch-friendly sizing shared by all icon toolbar buttons: 44px hit target
 * and larger icon below the `md` breakpoint (the same threshold the mobile
 * ribbon uses), desktop unchanged. `justify-center` keeps the glyph centered
 * inside the enlarged box.
 */
const touchButtonUi = { leadingIcon: "size-6 md:size-5" };
const touchButtonClass = "size-11 justify-center md:size-8";

// State to control the popover
const isStatsPopoverOpen = ref(false);
const isDismissable = ref(true);
const copySuccess = ref(false);

onCommand<UndoRedoStateChanged>(Cmds.UndoRedoStateChanged, async (command) => {
    undoRedoState.canUndo = command.canUndo;
    undoRedoState.canRedo = command.canRedo;
});

// Listen for the ShowTextStatsCommand to open the popover
onCommand<ShowTextStatsCommand>(Cmds.ShowTextStatsCommand, async () => {
    isStatsPopoverOpen.value = true;
    isDismissable.value = false;
});

// Listen for the HideTextStatsCommand to close the popover
onCommand<HideTextStatsCommand>(Cmds.HideTextStatsCommand, async () => {
    isStatsPopoverOpen.value = false;
    isDismissable.value = true;
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
            icon: "i-lucide-circle-check",
            duration: 2000,
        });
    } catch {
        toast.add({
            title: t("toolbar.copyFailed"),
            color: "error",
            icon: "i-lucide-circle-alert",
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
            icon: "i-lucide-circle-check",
            duration: 3000,
        });
    } catch {
        toast.add({
            title: t("toolbar.downloadFailed"),
            color: "error",
            icon: "i-lucide-circle-alert",
            duration: 3000,
        });
    }
}
</script>

<template>
    <div class="flex justify-between flex-wrap gap-y-1">
        <div class="flex items-center" data-tour="text-editor-toolpanel">
            <UTooltip :text="t('navigation.undo')" :kbds="['Ctrl', 'Z']">
                <UButton
                    icon="i-lucide-undo"
                    variant="link"
                    color="neutral"
                    :ui="touchButtonUi"
                    :class="touchButtonClass"
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
                    :ui="touchButtonUi"
                    :class="touchButtonClass"
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
                    :ui="touchButtonUi"
                    :class="touchButtonClass"
                    :disabled="readonly"
                    @click="emit('upload-file')"
                />
            </UTooltip>
            <UTooltip
                v-if="isCaptureSupported"
                :text="t('upload.capturePhoto')"
            >
                <UButton
                    icon="i-lucide-camera"
                    variant="link"
                    color="neutral"
                    :ui="touchButtonUi"
                    :class="touchButtonClass"
                    :disabled="readonly"
                    data-testid="capturePhotoButton"
                    @click="emit('capture-photo')"
                />
            </UTooltip>
            <UTooltip :text="t('toolbar.copyToClipboard')">
                <UButton
                    :icon="
                        copySuccess ? 'i-lucide-check' : 'i-lucide-clipboard'
                    "
                    variant="link"
                    :color="copySuccess ? 'success' : 'neutral'"
                    :ui="touchButtonUi"
                    :class="touchButtonClass"
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
                    :ui="touchButtonUi"
                    :class="touchButtonClass"
                    :disabled="!props.text"
                    data-testid="downloadWordButton"
                    @click="downloadWord"
                />
            </UTooltip>
        </div>

        <UPopover
            v-model:open="isStatsPopoverOpen"
            :dismissible="isDismissable"
        >
            <UButton
                class="text-gray-500 h-11 justify-center md:h-8"
                variant="link"
                color="neutral"
                data-tour="word-count"
                data-testid="characterCountButton"
            >
                {{ formatNumber(props.characters) }}
                / {{ formatNumber(props.limit) }} {{ t("toolbar.characters") }}
            </UButton>

            <template #content>
                <TextStatsView
                    :text="props.text"
                    class="w-[360px]"
                    data-tour="text-stats"
                />
            </template>
        </UPopover>
    </div>
</template>
