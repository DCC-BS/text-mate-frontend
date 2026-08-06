<script setup lang="ts">
/**
 * Bottom sheet with a free-text prompt for the "Custom" transform action.
 * The trigger is the default slot. `nested` must be set when opened from
 * inside another drawer.
 */
defineProps<{ disabled?: boolean; nested?: boolean }>();

const emit = defineEmits<{ submit: [config: string] }>();
const { t } = useI18n();

const open = ref(false);
const text = ref("");

function submit(): void {
    const value = text.value.trim();
    if (!value) return;
    emit("submit", value);
    text.value = "";
    open.value = false;
}
</script>

<template>
    <UDrawer v-model:open="open" :nested="nested">
        <slot />
        <template #content>
            <div
                class="p-4 pb-6 flex flex-col gap-3 max-w-[420px] w-full mx-auto"
            >
                <UTextarea
                    v-model="text"
                    :label="t('quick-actions.custom.label')"
                    :placeholder="t('quick-actions.custom.placeholder')"
                    :rows="5"
                />
                <UButton
                    size="lg"
                    block
                    :disabled="disabled || !text.trim()"
                    icon="i-lucide-sparkles"
                    @click="submit"
                >
                    {{ t("actions.apply") }}
                </UButton>
            </div>
        </template>
    </UDrawer>
</template>
