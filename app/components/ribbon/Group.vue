<script setup lang="ts">
interface Props {
    label: string;
    icon?: string;
}
defineProps<Props>();
</script>

<template>
    <div class="flex flex-col items-stretch justify-between gap-1 shrink-0">
        <div class="flex items-center gap-1.5 flex-wrap">
            <slot />
        </div>
        <div
            class="flex items-center gap-1 text-[10px] text-muted text-center justify-center select-none"
        >
            <UIcon v-if="icon" :name="icon" class="size-2.5" />
            <span>{{ label }}</span>
        </div>
    </div>
</template>
