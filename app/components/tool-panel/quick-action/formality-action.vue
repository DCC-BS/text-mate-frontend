<script lang="ts" setup>
import type { DropdownMenuItem } from '@nuxt/ui';

interface InputProps {
  actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit = defineEmits<(e: 'apply-action', action: "formality", config: string) => void>();

const { t } = useI18n();

const items = computed<DropdownMenuItem[]>(() => [
  { label: t('quick-actions.formality.formal'), value: 'formal', icon: "i-lucide-briefcase-business" },
  { label: t('quick-actions.formality.informal'), value: 'informal', icon: "i-lucide-tree-palm" },
]);

</script>

<template>
  <UDropdownMenu :items="items">
    <UButton variant="link" :disabled="!props.actionsAreAvailable">
      {{ t('editor.formality') }}
    </UButton>
    <template #item="{ item }">
      <UButton variant="link" color="neutral" :icon="item.icon" @click="
        () => {
          emit('apply-action', 'formality', item.value as string);
        }
      ">
        {{ item.label }}
      </UButton>
    </template>
  </UDropdownMenu>
</template>