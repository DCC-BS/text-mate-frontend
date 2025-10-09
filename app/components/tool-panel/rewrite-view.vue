<script lang="ts" setup>
import { AnimatePresence, motion } from "motion-v";
import { UButton } from "#components";
import {
    ApplyTextCommand,
    ToggleEditableEditorCommand,
} from "~/assets/models/commands";
import type { TextRewriteResponse } from "~/assets/models/text-rewrite";

interface RewriteViewProps {
    text: string;
}

const props = defineProps<RewriteViewProps>();

const MotionUButton = motion.create(UButton);

// composables
const { t } = useI18n();
const { addProgress, removeProgress } = useUseProgressIndication();
const { executeCommand } = useCommandBus();
const { sendError } = useUseErrorDialog();

// refs
const isRewriting = ref<boolean>(false);
const advancedMode = ref<boolean>(false);

const options = ref([
    {
        label: "rewrite.writingStyleLabel",
        valuePrefix: "rewrite.writing_style",
        value: "general",
        options: [
            "general",
            "simple",
            "professional",
            "casual",
            "academic",
            "technical",
        ],
    },
    {
        label: "rewrite.targetAudienceLabel",
        valuePrefix: "rewrite.target_audience",
        value: "general",
        options: [
            "general",
            "young",
            "adult",
            "children",
            "journalists",
            "scientists",
        ],
    },
    {
        label: "rewrite.intendLabel",
        valuePrefix: "rewrite.intend",
        value: "general",
        options: [
            "general",
            "persuasive",
            "informative",
            "descriptive",
            "narrative",
            "entertaining",
        ],
    },
    {
        label: "rewrite.mediumLabel",
        valuePrefix: "rewrite.medium",
        value: "general",
        options: [
            "general",
            "official letter", // Behördenbrief
            "email", // E-Mail
            "report", // Bericht
            "presentation",
            "website", // Webseite
        ],
    },
]);

const optionsString = computed(() => {
    return options.value
        .map(
            (option) =>
                `${t(option.label)}: ${t(`${option.valuePrefix}.${option.value}`)}`,
        )
        .join("\n");
});

const advancedOptions = ref(optionsString.value);
const isAdvancedDirty = ref(false);

watch(optionsString, (newValue) => {
    if (!isAdvancedDirty.value) {
        advancedOptions.value = newValue;
    }
});

watch(
    advancedOptions,
    (newValue) => {
        if (newValue !== optionsString.value) {
            isAdvancedDirty.value = true;
        }
    },
    { flush: "post" },
);

// computed
const advancedToggleIcon = computed(() => {
    return advancedMode.value ? "i-lucide-layers-3" : "i-lucide-layers-2";
});

const advancedToggleText = computed(() => {
    return advancedMode.value
        ? t("rewrite.hideAdvanced")
        : t("rewrite.showAdvanced");
});

const finalOptions = computed(() =>
    advancedMode.value ? advancedOptions.value : optionsString.value,
);
</script>

<template>
    <div class="flex flex-col h-full">
        <div class="flex justify-between mb-2">
            <ToolPanelTextQuickActionPanel :text="text" :options="finalOptions" />
            <UDrawer direction="right" handleOnly>
                <UButton icon="i-lucide-sliders" variant="soft" color="neutral">
                    Optionen
                </UButton>
                <template #content>
                    <div class="w-[400px] p-2">
                        <div>
                            <MotionUButton layout :label="advancedToggleText" :icon="advancedToggleIcon"
                                @click="advancedMode = !advancedMode" variant="link" color="neutral">
                            </MotionUButton>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div class="grid grid-cols-2 mb-3 gap-2" v-if="!advancedMode"
                                :initial="{ opacity: 0, x: 50 }" :exit="{ opacity: 0, x: 50 }"
                                :animate="{ x: 0, opacity: 1 }" :transition="{ duration: 0.2 }">

                                <template v-for="option in options" :key="option.label">
                                    <span>{{ t(option.label) }}</span>
                                    <SelectMenuLocalized v-model="option.value" :options="option.options"
                                        :local-parent="option.valuePrefix" />
                                </template>
                            </motion.div>
                            <motion.div v-if="advancedMode" class="mb-3" :initial="{ opacity: 0, x: -50 }"
                                :exit="{ opacity: 0, x: -50 }" :animate="{ x: 0, opacity: 1 }"
                                :transition="{ duration: 0.2 }">
                                <span>{{ t('rewrite.advancedOptionsLabel') }}</span>
                                <UTextarea class="w-full" :rows="5" v-model="advancedOptions">
                                </UTextarea>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </template>
            </UDrawer>
        </div>

        <div class="relative grow">
            <ToolPanelRewriteDiffViewer :text="text" />
        </div>
    </div>
</template>
