<script lang="ts" setup>

interface InputProps {
  actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit = defineEmits<(e: 'apply-action', action: "custom", config: string) => void>();

const { t } = useI18n();

const customText = ref("");
</script>

<template>
  <UDrawer>
    <UButton variant="link">{{ t('actions.custom') }}</UButton>
    <template #content>
      <div class="p-4 flex flex-col items-stretch gap-2 max-w-[400px] w-full m-auto">
        <UTextarea v-model="customText" :label="t('quick-actions.custom.label')"
          :placeholder="t('quick-actions.custom.placeholder')" class="w-full" :rows="6">
        </UTextarea>
        <UButton size="sm" @click="emit('apply-action', 'custom', customText)">{{ t('actions.apply') }}</UButton>
      </div>
    </template>
  </UDrawer>
</template>