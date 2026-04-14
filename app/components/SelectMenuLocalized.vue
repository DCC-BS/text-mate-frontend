<script lang="ts" setup>
// definitions
interface SelectMenuLocalizedProps {
    options: string[];
    localParent?: string;
}

// input
const props = withDefaults(defineProps<SelectMenuLocalizedProps>(), {
    localParent: "",
});

const modelValue = defineModel<string>("modelValue", { required: true });

const { t } = useI18n();
</script>

<template>
    <USelectMenu v-model="modelValue" :items="props.options">
        <template #default="{ modelValue }">
            {{ t(`${props.localParent}.${modelValue}`) }}
        </template>
        <template #item="{ item }">
            {{ t(`${props.localParent}.${item}`) }}
        </template>
    </USelectMenu>
</template>
