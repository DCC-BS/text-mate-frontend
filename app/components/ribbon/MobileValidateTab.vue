<script setup lang="ts">
import { ApplyFixCommand, CheckCommand } from "~/assets/models/commands";
import type { RibbonValidateProps } from "~/types/ribbon";

/**
 * Mobile validate ribbon. Only three actions (Check / Fix / Clear), so no
 * collapsing is needed — just big, touch-friendly buttons.
 */
const props = defineProps<RibbonValidateProps>();
const emit = defineEmits<{
    clear: [];
    "update:selectedDocs": [string[]];
}>();

const { t } = useI18n();
const { executeCommand } = useCommandBus();

const actionsAreAvailable = computed(
    () => props.editable && !props.busy && props.text.trim().length > 0,
);

const isDocSelectOpen = ref(false);

const selectedDocsModel = computed({
    get: () => props.selectedDocs,
    set: (value: string[]) => {
        if (value.length <= props.maxDocs) {
            emit("update:selectedDocs", value);
        }
    },
});

async function onValidate(): Promise<void> {
    isDocSelectOpen.value = false;
    await executeCommand(new CheckCommand());
}
</script>

<template>
    <div class="flex items-stretch gap-2 w-full min-w-0 md:hidden">
        <!-- Check -->
        <UDrawer v-model:open="isDocSelectOpen">
            <UButton
                variant="soft"
                color="neutral"
                class="flex-col h-auto py-2.5 gap-1 flex-1 min-w-0 rounded-xl"
                :disabled="!actionsAreAvailable"
            >
                <UIcon name="i-lucide-search-check" class="size-6" />
                <span class="text-xs font-medium truncate w-full text-center"
                    >{{ t("ribbon.check") }}</span
                >
            </UButton>
            <template #content>
                <div
                    class="flex flex-col justify-center items-center p-3 pb-6 gap-3"
                >
                    <p class="text-sm text-muted text-center">
                        {{ t("advisor.selectDocsDescription", {
                                maxDocs: props.maxDocs,
                            }) }}
                    </p>
                    <AdvisorDocSelect
                        v-model="selectedDocsModel"
                        :max="props.maxDocs"
                        class="w-full max-w-[360px]"
                    />
                    <UButton
                        size="lg"
                        block
                        :disabled="
                            !actionsAreAvailable || selectedDocs.length === 0
                        "
                        @click="onValidate"
                    >
                        {{ t("advisor.applyDocs") }}
                    </UButton>
                </div>
            </template>
        </UDrawer>

        <!-- Fix -->
        <UButton
            variant="soft"
            color="neutral"
            class="flex-col h-auto py-2.5 gap-1 flex-1 min-w-0 rounded-xl"
            :disabled="!actionsAreAvailable || toFixCount === 0"
            @click="executeCommand(new ApplyFixCommand())"
        >
            <UIcon name="i-lucide-wrench" class="size-6" />
            <span class="text-xs font-medium truncate w-full text-center"
                >{{ t("ribbon.fix") }}</span
            >
        </UButton>

        <!-- Clear -->
        <UButton
            variant="outline"
            color="neutral"
            class="flex-col h-auto py-2.5 gap-1 px-4 shrink-0 rounded-xl"
            :disabled="busy"
            @click="emit('clear')"
        >
            <UIcon name="i-lucide-trash-2" class="size-6" />
            <span class="text-xs font-medium">{{ t("ribbon.clear") }}</span>
        </UButton>
    </div>
</template>
