<script lang="ts" setup>
import { AnimatePresence, motion } from "motion-v";
import { UButton } from "#components";
import {
    ApplyTextCommand,
    RequestChangesCommand,
    ToggleEditableEditorCommand,
} from "~/assets/models/commands";
import type { TextRewriteResponse } from "~/assets/models/text-rewrite";

interface RewriteViewProps {
    text: string;
    selectedText?: TextFocus;
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

const writing_style = ref<string>("general");
const target_audience = ref<string>("general");
const intend = ref<string>("general");

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

const advancedOptions = ref(
    options.value
        .map(
            (option) =>
                `${t(option.label)}: ${t(`${option.valuePrefix}.${option.value}`)}`,
        )
        .join("\n"),
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

// functions
function getOptions(): string {
    if (!advancedMode.value) {
        return options.value
            .map(
                (option) =>
                    `${t(option.label)}: ${t(`${option.valuePrefix}.${option.value}`)}`,
            )
            .join("\n");
    }

    return advancedOptions.value;
}

async function rewriteText() {
    if (!props.selectedText) return;

    const { text: textToRewrite, start, end } = props.selectedText;

    const from = Math.max(0, start - 1);
    const to = Math.min(props.text.length, end) + 1;

    const context = `${props.text.slice(0, from)}<rewrite>${textToRewrite}</rewrite>${props.text.slice(to)}`;

    isRewriting.value = true;

    await executeCommand(new ToggleEditableEditorCommand(true));
    addProgress("rewriting", {
        icon: "i-heroicons-pencil",
        title: t("status.rewritingText"),
    });

    try {
        const body = {
            text: textToRewrite,
            context,
            options: getOptions(),
        };

        const response = await $fetch<TextRewriteResponse>("/api/rewrite", {
            body,
            method: "POST",
        });

        await executeCommand(
            new ApplyTextCommand(response.rewritten_text, {
                from,
                to,
            }),
        );

        await executeCommand(
            new RequestChangesCommand(
                textToRewrite,
                response.rewritten_text,
                from,
                from + response.rewritten_text.length + 1,
            ),
        );
    } catch (e: unknown) {
        if (e instanceof Error) {
            sendError(e.message);
        }
    } finally {
        isRewriting.value = false;
        removeProgress("rewriting");
    }
}
</script>

<template>
    <div class="flex justify-end mb-2">
        <div>
            <MotionUButton layout :label="advancedToggleText" :icon="advancedToggleIcon"
                @click="advancedMode = !advancedMode" variant="soft">
            </MotionUButton>
        </div>
    </div>

    <AnimatePresence mode="wait">
        <motion.div class="grid grid-cols-2 mb-3 gap-2" v-if="!advancedMode" :initial="{ opacity: 0, x: 50 }"
            :exit="{ opacity: 0, x: 50 }" :animate="{  x: 0,opacity: 1 }" :transition="{ duration: 0.2 }">

            <template v-for="option in options" :key="option.label">
                <span>{{ t(option.label) }}</span>
                <SelectMenuLocalized v-model="option.value" :options="option.options"   
                    :local-parent="option.valuePrefix" />
            </template>
        </motion.div>
        <motion.div v-if="advancedMode" class="mb-3" :initial="{ opacity: 0, x: -50 }"
            :exit="{ opacity: 0, x: -50 }" :animate="{  x: 0,opacity: 1 }" :transition="{ duration: 0.2 }">
            <span>{{ t('rewrite.advancedOptionsLabel') }}</span>
            <UTextarea class="w-full" :rows="5" v-model="advancedOptions">
            </UTextarea>
        </motion.div>
    </AnimatePresence>

    <div v-if="props.selectedText">
        <UButton @click="rewriteText()" variant="soft" :loading="isRewriting" :disabled="isRewriting">
            {{ t('rewrite.rewrite') }}
        </UButton>
    </div>
    <div v-else>
        <p class="text-sm text-gray-500">
            {{ t('rewrite.noRewrite') }}
        </p>
    </div>
</template>
