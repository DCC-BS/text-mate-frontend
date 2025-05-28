<script lang="ts" setup>
import type { NavigationMenuItem } from "#ui/components/NavigationMenu.vue";

interface InputProps {
    backUrl: string;
    items?: NavigationMenuItem[];
}

const props = withDefaults(defineProps<InputProps>(), {
    items: () => [],
});

// Add translation hook
const { t } = useI18n();

const { locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();
const router = useRouter();

const availableLocales = computed(() => {
    return locales.value.filter((i) => i.code !== locale.value);
});

function goBack(): void {
    router.back();
}

// Navigation menu items
const items = computed<NavigationMenuItem[][]>(() => [
    [
        {
            label: t("navigation.back"),
            icon: "i-lucide-arrow-left",
            to: props.backUrl,
        },
    ],
    [],
    [
        ...props.items,
        {
            icon: "i-lucide-languages",
            children: availableLocales.value.map((locale) => ({
                label: locale.name,
                to: switchLocalePath(locale.code),
            })),
        },
    ],
]);
</script>

<template>
    <div class="fixed w-full z-50 bg-white shadow-md">
        <UNavigationMenu
            content-orientation="vertical"
            :items="items"
            class="w-full justify-between z-50"
        />
    </div>
    <div class="h-[60px]" />
</template>
