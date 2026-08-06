<script setup lang="ts">
import type { MobileActionOption } from "~/composables/useMobileActions";

/**
 * Bottom sheet that lists the sub-options of a multi-option transform action
 * (e.g. Summarize → sentence / page / ...). The trigger is the default slot.
 * `nested` must be set when this sheet is opened from inside another drawer.
 */
defineProps<{
    label: string;
    options: MobileActionOption[];
    disabled?: boolean;
    nested?: boolean;
}>();

const emit = defineEmits<{ select: [config: string] }>();
const open = ref(false);

function choose(config: string): void {
    open.value = false;
    emit("select", config);
}
</script>

<template>
    <UDrawer v-model:open="open" :nested="nested">
        <slot />
        <template #content>
            <div class="p-3 pb-6 flex flex-col gap-1.5">
                <div class="text-sm font-medium text-muted px-1 pb-1">
                    {{ label }}
                </div>
                <UButton
                    v-for="opt in options"
                    :key="opt.config"
                    :icon="opt.icon"
                    :label="opt.label"
                    :disabled="disabled"
                    size="xl"
                    variant="outline"
                    color="neutral"
                    block
                    class="justify-start"
                    @click="choose(opt.config)"
                />
            </div>
        </template>
    </UDrawer>
</template>
