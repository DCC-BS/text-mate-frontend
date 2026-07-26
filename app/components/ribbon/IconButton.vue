<script setup lang="ts">
interface Props {
    label: string;
    icon?: string;
    disabled?: boolean;
}
withDefaults(defineProps<Props>(), { disabled: false });
</script>

<template>
    <UButton
        variant="link"
        color="neutral"
        size="sm"
        :icon="icon"
        :disabled="disabled"
        class="whitespace-nowrap"
    >
        {{ label }}
    </UButton>
</template>
