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

// composables
const { t } = useI18n();
const toast = useToast();
const { applyStreamToEditor } = useStreamWriter();

// computed
const actionsAreAvailable = computed(() => props.editor.getText().length > 3);

async function applyAction(action: Actions) {
    if (!actionsAreAvailable.value) {
        toast.add({
            title: "Error",
            description: "No text to process",
            color: "error",
            icon: "i-heroicons-exclamation-circle",
        });
        return;
    }

    let { from, to } = props.editor.state.selection;
    let text = props.editor.getText();

    if (from !== to) {
        text = props.editor.state.doc.textBetween(from, to);
    } else {
        from = 0;
        to = text.length + 1;
    }

    const response = (await $fetch("/api/quick-action", {
        responseType: "stream",
        method: "POST",
        body: {
            action,
            text,
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

    await applyStreamToEditor(reader, props.editor, from, to);
}
</script>

<template>
  <div class="flex justify-center gap-2 flex-wrap">
    <UButton
        variant="soft"
        :disabled="!actionsAreAvailable"
        @click="applyAction('simplify')">
        {{ t('editor.simplify') }}
    </UButton>
    <UButton
        variant="soft"
        :disabled="!actionsAreAvailable"
        @click="applyAction('shorten')">
        {{ t('editor.shorten') }}
    </UButton>
    <UButton
        variant="soft"
        :disabled="!actionsAreAvailable"
        @click="applyAction('bullet_points')">
        {{ t('editor.bullet_points') }}
    </UButton>
    <UButton
        variant="soft"
        :disabled="!actionsAreAvailable"
        @click="applyAction('summarize')">
        {{ t('editor.summarize') }}
    </UButton>
    <UButton
        variant="soft"
        :disabled="!actionsAreAvailable"
        @click="applyAction('social_mediafy')">
        {{ t('editor.social_mediafy') }}
    </UButton>
  </div>
</template>