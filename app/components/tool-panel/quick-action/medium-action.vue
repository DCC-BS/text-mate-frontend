<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui";

interface InputProps {
    actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit =
    defineEmits<
        (e: "apply-action", action: "medium", config: string) => void
    >();

const { t } = useI18n();

const items = computed<DropdownMenuItem[]>(() => [
    {
        label: t("quick-actions.medium.email"),
        value: "email",
        icon: "i-lucide-mail",
    },
    {
        label: t("quick-actions.medium.official_letter"),
        value: "official_letter",
        icon: "i-lucide-mailbox",
    },
    {
        label: t("quick-actions.medium.presentation"),
        value: "presentation",
        icon: "i-lucide-presentation",
    },
    {
        label: t("quick-actions.medium.report"),
        value: "report",
        icon: "i-lucide-file-chart-column",
    },
]);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton variant="link" :disabled="!props.actionsAreAvailable">
      {{ t('editor.medium') }}
    </UButton>
    <template #item="{ item }">
      <UButton variant="link" color="neutral" :icon="item.icon" @click="
        () => {
          emit('apply-action', 'medium', item.value as string);
        }
      ">
        {{ item.label }}
      </UButton>
    </template>
  </UDropdownMenu>
</template>