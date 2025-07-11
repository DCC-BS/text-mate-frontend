<script lang="ts" setup>
import type { NavigationMenuItem } from "#ui/components/NavigationMenu.vue";
import {
    Cmds,
    RedoCommand,
    UndoCommand,
    type UndoRedoStateChanged,
} from "~/assets/models/commands";

// Add translation hook
const { t } = useI18n();
const { executeCommand, registerHandler, unregisterHandler } = useCommandBus();

const undoRedoState = reactive({
    canUndo: false,
    canRedo: false,
});

const { locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();

const availableLocales = computed(() => {
    return locales.value.filter((i) => i.code !== locale.value);
});

// Navigation menu items
const items = computed<NavigationMenuItem[][]>(() => [
    [
        {
            label: t("navigation.undo"),
            icon: "i-heroicons-arrow-uturn-left",
            onSelect: () => handleUndo(),
            disabled: !undoRedoState.canUndo,
        },
        {
            label: t("navigation.redo"),
            icon: "i-heroicons-arrow-uturn-right",
            onSelect: handleRedo,
            disabled: !undoRedoState.canRedo,
        },
    ],
    [],
    [
        {
            label: t("navigation.languages"),
            icon: "i-heroicons-language",
            children: availableLocales.value.map((locale) => ({
                label: locale.name,
                to: switchLocalePath(locale.code),
            })),
        },
    ],
]);

onMounted(() => {
    registerHandler(Cmds.UndoRedoStateChanged, handleUndoRedoStateChanged);
});

onUnmounted(() => {
    unregisterHandler(Cmds.UndoRedoStateChanged, handleUndoRedoStateChanged);
});

async function handleUndoRedoStateChanged(command: UndoRedoStateChanged) {
    undoRedoState.canUndo = command.canUndo;
    undoRedoState.canRedo = command.canRedo;
}

function handleUndo(): void {
    executeCommand(new UndoCommand());
}

function handleRedo(): void {
    executeCommand(new RedoCommand());
}
</script>

<template>
    <div>
        <UNavigationMenu
            content-orientation="vertical"
            :items="items"
            class="w-full justify-between z-50"
        />
    </div>
</template>
