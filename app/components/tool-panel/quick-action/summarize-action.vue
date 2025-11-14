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
  },
  {
    label: t("quick-actions.summarize.three_sentence"),
    value: "three_sentence",
    icon: "i-lucide-tally-3",
  },
  {
    label: t("quick-actions.summarize.paragraph"),
    value: "paragraph",
    icon: "i-lucide-text-wrap",
  },
  {
    label: t("quick-actions.summarize.page"),
    value: "page",
    icon: "i-lucide-file-text",
  },
  {
    label: t("quick-actions.summarize.management_summary"),
    value: "management_summary",
    icon: "i-lucide-file-text",
  },
]);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton variant="link" :disabled="!props.actionsAreAvailable">
      {{ t('editor.summarize') }}
    </UButton>
    <template #item="{ item }">
      <UButton variant="link" color="neutral" :icon="item.icon" @click="
        () => {
          emit('apply-action', 'summarize', item.value as string);
        }
      ">
        {{ item.label }}
      </UButton>
    </template>
  </UDropdownMenu>
</template>