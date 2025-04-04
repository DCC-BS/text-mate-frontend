<script lang="ts" setup>
import type { Editor } from "@tiptap/vue-3";

interface QuickActionsPanelProps {
    editor: Editor;
}

// Updated to include social_mediafy action
type Actions =
    | "simplify"
    | "shorten"
    | "bullet_points"
    | "summarize"
    | "social_mediafy";

const props = defineProps<QuickActionsPanelProps>();

const { t } = useI18n();
const toast = useToast();
const { applyStreamToEditor } = useStreamWriter();

async function simplify() {
    applyAction("simplify");
}

async function applyAction(action: Actions) {
    const response = (await $fetch("/api/quick-action", {
        responseType: "stream",
        method: "POST",
        body: {
            action,
            text: props.editor.getHTML(),
        },
    })) as ReadableStream;

    if (!response) {
        toast.add({
            title: "Error",
            description: "Failed to get response from server",
            color: "error",
            icon: "i-heroicons-exclamation-circle",
        });
        return;
    }

    const reader = response.getReader();

    await applyStreamToEditor(reader, props.editor);
}
</script>

<template>
  <div class="flex justify-center gap-2">
    <UButton
        variant="soft"
        @click="applyAction('simplify')">
        {{ t('editor.simplify') }}
    </UButton>
    <UButton
        variant="soft"
        @click="applyAction('shorten')">
        {{ t('editor.shorten') }}
    </UButton>
    <UButton
        variant="soft"
        @click="applyAction('bullet_points')">
        {{ t('editor.bullet_points') }}
    </UButton>
    <UButton
        variant="soft"
        @click="applyAction('summarize')">
        {{ t('editor.summarize') }}
    </UButton>
    <UButton
        variant="soft"
        @click="applyAction('social_mediafy')">
        {{ t('editor.social_mediafy') }}
    </UButton>
  </div>
</template>

<style>

</style>