<script lang="ts" setup>

// definitions
interface SelectMenuLocalizedProps {
    options: string[];
    localParent?: string;
}

// input
const props = withDefaults(defineProps<SelectMenuLocalizedProps>(), {
    localParent: '',
});

const modelValue = defineModel<string>('modelValue', { required: true });

const { t } = useI18n();
</script>

<template>
    <USelectMenu v-model="modelValue" :options="props.options">
        <template #option="{ option }">
            {{ t(`${props.localParent}.${option}`) }}
        </template>
        <template #label>
            {{ t(`${props.localParent}.${modelValue}`) }}
        </template>
    </USelectMenu>
</template>
