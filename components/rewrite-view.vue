<script lang="ts" setup>
import { ApplyTextCommand } from "~/assets/models/commands";
import type {
    RewriteApplyOptions,
    TextRewriteResponse,
} from "~/assets/models/text-rewrite";

import type { Range } from "@tiptap/vue-3";

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
const rewriteOptions = ref<RewriteApplyOptions>();

const writing_style = ref<string>("general");
const target_audience = ref<string>("general");
const intend = ref<string>("general");
const lastSelection = ref<Range>();

// functions
async function rewriteText() {
    if (!props.selectedText) return;

    const { text: textToRewrite, start, end } = props.selectedText;

    const from = Math.max(0, start - 1);
    const to = Math.min(props.text.length, end + 1);

    const context = `${props.text.slice(0, from)}<rewrite>${textToRewrite}</rewrite>${props.text.slice(to)}`;

    rewriteOptions.value = undefined;
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
        rewriteOptions.value = { from, to, options: response.options };
        lastSelection.value = {
            from,
            to,
        };
    } catch (e: unknown) {
        if (e instanceof Error) {
            sendError(e.message);
        }
    } finally {
        removeProgress("rewriting");
    }
}

function applyRewrite(option: string) {
    if (!lastSelection.value) {
        return;
    }

    executeCommand(
        new ApplyTextCommand(option, {
            from: lastSelection.value.from,
            to: lastSelection.value.to,
        }),
    );

    rewriteOptions.value = undefined;
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

    <div>
        <UButton @click="rewriteText()" variant="soft">
            {{ t('rewrite.rewrite') }}
        </UButton>
    </div>
    <div v-if="rewriteOptions && rewriteOptions.options.length > 0">
        <div v-for="option in rewriteOptions.options">
            <div v-html="option.replace(/\n/g, '<br>')" />
            <UButton @click="applyRewrite(option)">{{ t('rewrite.apply') }} </UButton>
        </div>
    </div>
    <div v-else>
        <USkeleton class="w-full h-[300px]" />
    </div>
</template>
