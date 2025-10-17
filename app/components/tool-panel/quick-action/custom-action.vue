<script lang="ts" setup>
interface InputProps {
    actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit =
    defineEmits<
        (e: "apply-action", action: "custom", config: string) => void
    >();

const { t } = useI18n();

const customText = ref("");
const isDrawerOpen = ref(false);

function submitAction() {
    emit("apply-action", "custom", customText.value);
    isDrawerOpen.value = false;
}
</script>

<template>
  <UDrawer v-model:open="isDrawerOpen">
    <UButton variant="link" :disabled="!props.actionsAreAvailable">{{ t('actions.custom') }}</UButton>
    <template #content>
      <div class="p-4 flex flex-col items-stretch gap-2 max-w-[400px] w-full m-auto">
        <UTextarea v-model="customText" :label="t('quick-actions.custom.label')"
          :placeholder="t('quick-actions.custom.placeholder')" class="w-full" :rows="6"
          data-testid="customActionTextBox">
        </UTextarea>
        <UButton size="sm" @click="submitAction" data-testid="customActionSubmit">{{
          t('actions.apply') }}</UButton>
      </div>
    </template>
  </UDrawer>
</template>