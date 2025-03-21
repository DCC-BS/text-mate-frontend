<script lang="ts" setup>

const props = defineProps<{ label: string }>();

const model = defineModel<number>('modelValue', { required: true });

const colorVariant = computed(() => {
    if (model.value < 0.3) return 'red';
    if (model.value < 0.7) return 'yellow';
    return 'green';
});
</script>

<template>
    <UMeter :value="model" :min="0" :max="1" :color="colorVariant" :label="props.label" />
</template>
