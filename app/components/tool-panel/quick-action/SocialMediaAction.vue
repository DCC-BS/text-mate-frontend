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
    onSelect: () => emit("apply-action", "social_mediafy", "bluesky"),
  },
  {
    label: t("quick-actions.social-mediafy.instagram"),
    value: "instagramm",
    icon: "i-simple-icons-instagram",
    onSelect: () => emit("apply-action", "social_mediafy", "instagramm"),
  },
  {
    label: t("quick-actions.social-mediafy.linkedin"),
    value: "linkedin",
    icon: "i-simple-icons-linkedin",
    onSelect: () => emit("apply-action", "social_mediafy", "linkedin"),
  },
]);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton variant="link" :disabled="!props.actionsAreAvailable">
      {{ t('editor.social_mediafy') }}
    </UButton>
  </UDropdownMenu>
</template>