<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui";

import {
    Cmds,
    RedoCommand,
    UndoCommand,
    type UndoRedoStateChanged,
} from "~/assets/models/commands";

// Add translation hook
const { t } = useI18n();
const { executeCommand, onCommand } = useCommandBus();
const { data, signOut } = useAuth();

const undoRedoState = reactive({
    canUndo: false,
    canRedo: false,
});

const { locale, locales, setLocale } = useI18n();

const availableLocales = computed(() => {
    return locales.value.filter((i) => i.code !== locale.value);
});

const userImage = computed(() => {
    const base64 = data.value?.user?.image;
    return base64 ? base64 : "/LucideCircleUserRound.png";
});

// Navigation menu items
const items = computed<DropdownMenuItem[]>(() => [
    {
        label: t("navigation.signOut"),
        icon: "i-lucide-sign-out",
        onSelect: handleSignOut,
    },
]);

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

async function handleSignOut(): Promise<void> {
    await signOut();
}
</script>

<template>
    <NavigationBar>
        <template #right>
            <UDropdownMenu :items="items">
                <UButton variant="ghost" color="neutral">
                    <img :src="userImage" class="h-6 w-6 rounded-full" :alt="data?.user?.name || 'User'" />
                </UButton>
            </UDropdownMenu>
        </template>
    </NavigationBar>
</template>