<script lang="ts" setup>
import type { SelectMenuItem } from "@nuxt/ui";
import { SwitchCorrectionLanguageCommand } from "~/assets/models/commands";

const { t } = useI18n();
const { executeCommand } = useCommandBus();

const languages = [
    {
        key: "auto",
        icon: "i-heroicons-globe-alt",
    },
    {
        key: "de-CH",
        icon: "i-flag-de-4x3",
    },
    {
        key: "fr",
        icon: "i-flag-fr-4x3",
    },
    {
        key: "it",
        icon: "i-flag-it-4x3",
    },
    {
        key: "en-US",
        icon: "i-flag-us-4x3",
    },
    {
        key: "en-GB",
        icon: "i-flag-gb-4x3",
    },
];

const items = languages.map(
    (lang) =>
        ({
            key: lang.key,
            icon: lang.icon,
            label: t(`language.${lang.key}`),
        }) as SelectMenuItem & { key: string },
);

const selectedLanguage = ref<SelectMenuItem & { key: string }>(items[0]);

watch(selectedLanguage, (lang) => {
    executeCommand(new SwitchCorrectionLanguageCommand(lang.key));
});
</script>

<template>
  <div>
    <USelectMenu :items="items" v-model="selectedLanguage" class="w-full">
    </USelectMenu>
  </div>
</template>