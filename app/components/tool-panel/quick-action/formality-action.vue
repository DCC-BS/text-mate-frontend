<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui";

interface InputProps {
  actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit =
  defineEmits<
    (e: "apply-action", action: "formality", config: string) => void
  >();

const { t } = useI18n();

const items = computed<DropdownMenuItem[]>(() => [
  {
    label: t("quick-actions.formality.formal"),
    value: "formal",
    icon: "i-lucide-briefcase-business",
    onSelect: () => emit("apply-action", "formality", "formal"),
  },
  {
    label: t("quick-actions.formality.informal"),
    value: "informal",
    icon: "i-lucide-tree-palm",
    onSelect: () => emit("apply-action", "formality", "informal"),
  },
]);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton variant="link" :disabled="!props.actionsAreAvailable">
      {{ t('editor.formality') }}
    </UButton>
  </UDropdownMenu>
</template>