<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui";

// Add translation hook
const { t } = useI18n();
const { data, signOut, isAuthEnabled, inMsTeams } = useAppAuth();
const { ribbonTab, setRibbonTab } = useRibbonTab();

const userImage = computed(() => {
    const base64 = data.value?.user?.image;
    return base64 ? base64 : "/LucideCircleUserRound.png";
});

// Navigation menu items
const items = computed<DropdownMenuItem[]>(() => [
    {
        label: t("navigation.signOut"),
        icon: "i-lucide-log-out",
        onSelect: handleSignOut,
    },
]);

async function handleSignOut(): Promise<void> {
    await signOut();
}

const apps = useAppList("TextMate");
</script>

<template>
    <div>
        <NavigationBar :other-apps="apps" :show-app-switcher="!inMsTeams">
            <template #center>
                <div class="hidden md:flex items-end gap-1">
                    <UButton
                        :variant="ribbonTab === 'transform' ? 'soft' : 'link'"
                        :color="ribbonTab === 'transform' ? 'primary' : 'neutral'"
                        size="sm"
                        icon="i-lucide-wand-sparkles"
                        data-tour="ribbon-transform"
                        @click="setRibbonTab('transform')"
                    >
                        {{ t("ribbon.transform") }}
                    </UButton>
                    <UButton
                        :variant="ribbonTab === 'validate' ? 'soft' : 'link'"
                        :color="ribbonTab === 'validate' ? 'primary' : 'neutral'"
                        size="sm"
                        icon="i-lucide-file-search"
                        data-tour="ribbon-validate"
                        @click="setRibbonTab('validate')"
                    >
                        {{ t("ribbon.validate") }}
                    </UButton>
                </div>
            </template>
            <template #rightPostItems>
                <UDropdownMenu v-if="isAuthEnabled" :items="items">
                    <UButton variant="ghost" color="neutral">
                        <img
                            :src="userImage"
                            class="h-6 w-6 rounded-full"
                            :alt="data?.user?.name || 'User'"
                        >
                    </UButton>
                </UDropdownMenu>
            </template>
        </NavigationBar>
        <div class="px-2 md:hidden w-full flex justify-stretch gap-1">
            <UButton
                class="grow"
                :variant="ribbonTab === 'transform' ? 'soft' : 'link'"
                :color="ribbonTab === 'transform' ? 'primary' : 'neutral'"
                icon="i-lucide-wand-sparkles"
                data-tour="ribbon-transform-mobile"
                @click="setRibbonTab('transform')"
            >
                {{ t("ribbon.transform") }}
            </UButton>
            <UButton
                class="grow"
                :variant="ribbonTab === 'validate' ? 'soft' : 'link'"
                :color="ribbonTab === 'validate' ? 'primary' : 'neutral'"
                icon="i-lucide-file-search"
                data-tour="ribbon-validate-mobile"
                @click="setRibbonTab('validate')"
            >
                {{ t("ribbon.validate") }}
            </UButton>
        </div>
    </div>
</template>
