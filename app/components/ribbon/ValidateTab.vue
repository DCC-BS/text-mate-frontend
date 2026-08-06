<script lang="ts" setup>
import { ApplyFixCommand, CheckCommand } from "~/assets/models/commands";
import type { RibbonValidateProps } from "~/types/ribbon";

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
    set: (value: string[]) => onUpdateDocs(value),
});

function onUpdateDocs(newValue: string[]) {
    if (newValue.length > props.maxDocs) {
        return;
    }

    emit("update:selectedDocs", newValue);
}

async function onValidate() {
    isDocSelectOpen.value = false;
    await executeCommand(new CheckCommand());
}
</script>

<template>
    <!-- Check / Fix -->
    <RibbonGroup :label="t('ribbon.validate')" icon="i-lucide-file-search">
        <UDrawer v-model:open="isDocSelectOpen">
            <RibbonIconButton
                :label="t('ribbon.check')"
                icon="i-lucide-search-check"
                :disabled="!actionsAreAvailable"
                data-tour="ribbon-check"
            />
            <template #content>
                <div
                    class="flex flex-col justify-center items-center p-2 gap-2"
                >
                    <div>
                        {{ t('advisor.selectDocsDescription', { maxDocs: props.maxDocs }) }}
                    </div>
                    <AdvisorDocSelect
                        v-model="selectedDocsModel"
                        :max="props.maxDocs"
                    />
                    <UButton
                        @click="onValidate"
                        :disabled="!actionsAreAvailable || selectedDocs.length === 0
                "
                    >
                        {{ t("advisor.applyDocs") }}
                    </UButton>
                </div>
            </template>
        </UDrawer>
        <RibbonIconButton
            :label="t('ribbon.fix')"
            icon="i-lucide-wrench"
            :disabled="!actionsAreAvailable || toFixCount === 0"
            @click="executeCommand(new ApplyFixCommand())"
        />
    </RibbonGroup>

    <RibbonDivider />

    <!-- Clear -->
    <RibbonGroup :label="t('ribbon.clear')" icon="i-lucide-eraser">
        <RibbonIconButton
            :label="t('ribbon.clear')"
            icon="i-lucide-trash-2"
            :disabled="busy"
            @click="emit('clear')"
        />
    </RibbonGroup>
</template>
