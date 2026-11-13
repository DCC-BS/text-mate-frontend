<script setup lang="ts">
const { activeProgress } = useUseProgressIndication();
const { t } = useI18n();

const progressItems = computed(() => {
    return Array.from(activeProgress.value.values());
});
</script>

<template>
    <!-- Floating pill above the footer; only rendered while something runs. -->
    <div
        v-if="progressItems.length > 0"
        class="flex justify-center pointer-events-none"
        role="status"
        aria-live="polite"
    >
        <div
            class="flex flex-row flex-wrap gap-3 items-center px-3 py-1.5 rounded-full bg-default/95 ring-1 ring-default shadow-md text-sm text-muted"
        >
            <UIcon
                name="i-lucide-loader"
                class="animate-spin"
                :aria-label="t('loading')"
            />
            <div
                v-for="progress in progressItems"
                :key="progress.title"
                class="flex items-center gap-1.5"
            >
                <UIcon :name="progress.icon" />
                <span>{{ progress.title }}</span>
            </div>
        </div>
    </div>
</template>
