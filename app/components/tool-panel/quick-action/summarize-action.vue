<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui";

interface InputProps {
  actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit =
  defineEmits<
    (e: "apply-action", action: "summarize", config: string) => void
  >();

const { t } = useI18n();

const items = computed<DropdownMenuItem[]>(() => [
  {
    label: t("quick-actions.summarize.sentence"),
    value: "sentence",
    icon: "i-lucide-tally-1",
    onSelect: () => emit("apply-action", "summarize", "sentence"),
  },
  {
    label: t("quick-actions.summarize.three_sentence"),
    value: "three_sentence",
    icon: "i-lucide-tally-3",
    onSelect: () => emit("apply-action", "summarize", "three_sentence"),
  },
  {
    label: t("quick-actions.summarize.paragraph"),
    value: "paragraph",
    icon: "i-lucide-text-wrap",
    onSelect: () => emit("apply-action", "summarize", "paragraph"),
  },
  {
    label: t("quick-actions.summarize.page"),
    value: "page",
    icon: "i-lucide-file-text",
    onSelect: () => emit("apply-action", "summarize", "page"),
  },
  {
    label: t("quick-actions.summarize.management_summary"),
    value: "management_summary",
    icon: "i-lucide-file-user",
    onSelect: () => emit("apply-action", "summarize", "management_summary"),
  },
]);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton variant="link" :disabled="!props.actionsAreAvailable">
      {{ t('editor.summarize') }}
    </UButton>
  </UDropdownMenu>
</template>