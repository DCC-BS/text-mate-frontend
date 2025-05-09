<script lang="ts" setup>
import App from "~/app.vue";
import {
    ApplyTextCommand,
    RequestChangesCommand,
} from "~/assets/models/commands";
import type { TextRewriteResponse } from "~/assets/models/text-rewrite";

interface RewriteViewProps {
    text: string;
    selectedText?: TextFocus;
}

const props = defineProps<RewriteViewProps>();

// composables
const { t } = useI18n();
const { addProgress, removeProgress } = useUseProgressIndication();
const { executeCommand } = useCommandBus();
const { sendError } = useUseErrorDialog();

// refs
const isRewriting = ref<boolean>(false);

const writing_style = ref<string>("general");
const target_audience = ref<string>("general");
const intend = ref<string>("general");

// functions
async function rewriteText() {
    if (!props.selectedText) return;

    const { text: textToRewrite, start, end } = props.selectedText;

    const from = Math.max(0, start - 1);
    const to = Math.min(props.text.length, end) + 1;

    const context = `${props.text.slice(0, from)}<rewrite>${textToRewrite}</rewrite>${props.text.slice(to)}`;

    isRewriting.value = true;
    addProgress("rewriting", {
        icon: "i-heroicons-pencil",
        title: t("status.rewritingText"),
    });

    try {
        const body = {
            text: textToRewrite,
            context,
            writing_style: writing_style.value,
            target_audience: target_audience.value,
            intend: intend.value,
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
    <div class="grid grid-cols-2 mb-3 gap-2">
        <span>{{ t('rewrite.writingStyleLabel') }}</span>
        <SelectMenuLocalized
            v-model="writing_style" 
            :options="['general', 'simple', 'professional', 'casual', 'academic', 'technical']"
            local-parent="rewrite.writing_style" />

        <span>{{ t('rewrite.targetAudienceLabel') }}</span>
        <SelectMenuLocalized
            v-model="target_audience"
            :options="['general', 'young', 'adult', 'children']"
            local-parent="rewrite.target_audience" />
            
        <span>{{ t('rewrite.intendLabel') }}</span>
        <SelectMenuLocalized
            v-model="intend"
            :options="['general', 'persuasive', 'informative', 'descriptive', 'narrative', 'entertaining']"
            local-parent="rewrite.intend" />
    </div>

    <div v-if="props.selectedText">
        <UButton 
            @click="rewriteText()" 
            variant="soft" 
            :loading="isRewriting"
            :disabled="isRewriting">
            {{ t('rewrite.rewrite') }}
        </UButton>
    </div>
    <div v-else>
        <p class="text-sm text-gray-500">
            {{ t('rewrite.noRewrite') }}
        </p>
    </div>
</template>
