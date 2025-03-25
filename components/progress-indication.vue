<script lang="ts" setup>
const { activeProgress } = useUseProgressIndication();

const progressItems = computed(() => {
    return Object.values(activeProgress.value);
});
</script>

<template>
    <div class="flex flex-row gap-2 items-center justify-center">
        <UIcon v-if="progressItems.length > 0" name="i-heroicons-arrow-path" class="animate-spin" />
        <div v-for="progress in progressItems" :key="progress.title">
            <UIcon :name="progress.icon" />
            <span>{{ progress.title }}</span>
        </div>
    </div>
</template>
