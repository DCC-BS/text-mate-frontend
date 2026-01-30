<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui";

interface InputProps {
    actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit =
    defineEmits<
        (e: "apply-action", action: "character_speech", config: string) => void
    >();

const { t } = useI18n();

const items = computed<DropdownMenuItem[]>(() => [
    {
        label: t("quick-actions.character_speech.direct"),
        value: "direct_speech",
        icon: "i-lucide-message-square-more",
        onSelect: () => emit("apply-action", "character_speech", "direct_speech"),
    },
    {
        label: t("quick-actions.character_speech.indirect"),
        value: "indirect_speech",
        icon: "i-lucide-message-square-quote",
        onSelect: () => emit("apply-action", "character_speech", "indirect_speech"),
    },
]);
</script>

<template>
    <UDropdownMenu :items="items">
        <UButton variant="link" :disabled="!props.actionsAreAvailable">
            {{ t('editor.character_speech') }}
        </UButton>
    </UDropdownMenu>
</template>
