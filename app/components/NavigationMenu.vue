<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui";
import { RestartTourCommand } from "~/assets/models/commands";

// Add translation hook
const { t } = useI18n();
const { data, signOut, isAuthEnabled } = useAppAuth();
const { executeCommand } = useCommandBus();

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

async function handleSignOut(): Promise<void> {
    await signOut();
}

function handleRestartTour(): void {
    executeCommand(new RestartTourCommand());
}
</script>

<template>
    <NavigationBar>
        <template #rightPostItems>
        <template #right>
            <OnlineStatus />
            <UTooltip :text="t('tour.restart')" placement="bottom">
                <UButton
                    data-tour="start-tour"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-help-circle"
                    @click="handleRestartTour"
                />
            </UTooltip>
            <UDropdownMenu v-if="isAuthEnabled" :items="items">
                <UButton variant="ghost" color="neutral">
                    <img
                        :src="userImage"
                        class="h-6 w-6 rounded-full"
                        :alt="data?.user?.name || 'User'"
                    />
                </UButton>
            </UDropdownMenu>
        </template>
    </NavigationBar>
</template>
