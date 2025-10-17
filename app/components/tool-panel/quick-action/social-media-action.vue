<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui";

interface InputProps {
    actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit =
    defineEmits<
        (e: "apply-action", action: "social_mediafy", config: string) => void
    >();

const { t } = useI18n();

const items = computed<DropdownMenuItem[]>(() => [
    {
        label: t("quick-actions.social-mediafy.bluesky"),
        value: "bluesky",
        icon: "i-simple-icons-bluesky",
    },
    {
        label: t("quick-actions.social-mediafy.instagram"),
        value: "instagramm",
        icon: "i-simple-icons-instagram",
    },
    {
        label: t("quick-actions.social-mediafy.linkedin"),
        value: "linkedin",
        icon: "i-simple-icons-linkedin",
    },
]);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton variant="link" :disabled="!props.actionsAreAvailable">
      {{ t('editor.social_mediafy') }}
    </UButton>
    <template #item="{ item }">
      <UButton variant="link" color="neutral" :icon="item.icon" @click="
        () => {
          emit('apply-action', 'social_mediafy', item.value as string);
        }
      ">
        {{ item.label }}
      </UButton>
    </template>
  </UDropdownMenu>
</template>