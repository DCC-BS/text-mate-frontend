<script lang="ts" setup>
import type { DropdownMenuItem } from "@nuxt/ui";
import type { Editor } from "@tiptap/vue-3";
import {
    RequestChangesCommand,
    ToggleEditableEditorCommand,
    ToggleLockEditorCommand,
} from "~/assets/models/commands";

interface QuickActionsPanelProps {
    editor: Editor;
}

// Updated to include social_mediafy action
type Actions =
    | "plain_language"
    | "easy_language"
    | "bullet_points"
    | "summarize"
    | "social_mediafy"
    | "translate_de-CH"
    | "translate_en-US"
    | "translate_en-GB"
    | "translate_fr"
    | "translate_it";

const props = defineProps<QuickActionsPanelProps>();

// composables
const { t } = useI18n();
const toast = useToast();
const { applyStreamToEditor } = useStreamWriter();
const { addProgress, removeProgress } = useUseProgressIndication();
const { executeCommand } = useCommandBus();

// refs
const isRewriting = ref<boolean>(false);
// const items = ref<DropdownMenuItem[]>([
//     {
//         label: t("quick-actions.de-CH"),
//         icon: "i-flag-de-4x3",
//         onSelect: () => {
//             applyAction("translate_de-CH");
//         },
//     },
//     {
//         label: t("quick-actions.en-US"),
//         icon: "i-flag-us-4x3",
//         onSelect: () => {
//             applyAction("translate_en-US");
//         },
//     },
//     {
//         label: t("quick-actions.en-GB"),
//         icon: "i-flag-gb-4x3",
//         onSelect: () => {
//             applyAction("translate_en-GB");
//         },
//     },
//     {
//         label: t("quick-actions.fr"),
//         icon: "i-flag-fr-4x3",
//         onSelect: () => {
//             applyAction("translate_fr");
//         },
//     },
//     {
//         label: t("quick-actions.it"),
//         icon: "i-flag-it-4x3",
//         onSelect: () => {
//             applyAction("translate_it");
//         },
//     },
// ]);

// computed
const textSelectionRange = computed(() => {
    const { from, to } = props.editor.state.selection;

    if (from === to) {
        return {
            from: 0,
            to: props.editor.getText().length + 1,
        };
    }

    return {
        from,
        to,
    };
});

const selectedText = computed(() => {
    const { from, to } = textSelectionRange.value;
    return props.editor.state.doc.textBetween(from, to);
});

const actionsAreAvailable = computed(
    () => selectedText.value.length > 3 && !isRewriting.value,
);

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

    try {
        await executeCommand(new ToggleEditableEditorCommand(true));
        await executeCommand(new ToggleLockEditorCommand(true));

        if (action === "easy_language") {
        }

        addProgress("quick-action", {
            icon: "i-lucide-text-search",
            title: t("status.quickAction"),
        });
        isRewriting.value = true;

        const { from, to } = textSelectionRange.value;
        const text = selectedText.value;

        const response = (await $fetch("/api/quick-action", {
            responseType: "stream",
            method: "POST",
            body: {
                action,
                text,
            },
        })) as ReadableStream<Uint8Array>;

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
        const oldText = props.editor.state.doc.textBetween(from, to);

        const newText = await applyStreamToEditor(
            reader,
            props.editor,
            from,
            to,
        );

        await executeCommand(new ToggleLockEditorCommand(false));

        await executeCommand(
            new RequestChangesCommand(
                oldText,
                newText,
                from,
                from + newText.length + 1,
            ),
        );
    } finally {
        await executeCommand(new ToggleLockEditorCommand(false));
        removeProgress("quick-action");
        isRewriting.value = false;
    }
}
</script>

<template>
  <div class="flex justify-center gap-2 flex-wrap">
    <UPopover mode="hover">
        <UButton
            variant="soft"
            :disabled="!actionsAreAvailable"
            @click="applyAction('plain_language')">
            {{ t('editor.plain_language') }}
        </UButton>
        <template #content>
            <div class="max-w-[50vw] p-2">
                <div>
                    {{ t('plain-language.notice') }}
                </div>
            </div>
        </template>
    </UPopover>
    <UPopover mode="hover">
        <UButton
            variant="soft"
            :disabled="!actionsAreAvailable"
            @click="applyAction('easy_language')">
            {{ t('editor.easy_language') }}
        </UButton>
        <template #content>
            <div class="max-w-[50vw] p-2">
                <div>
                    {{ t('easy-language.notice') }}
                </div>
                <div class="mt-2">
                    <strong>{{ t('easy-language.moreInfo') }}</strong>
                </div>
                <div class="mt-1">
                    <strong>{{ t('easy-language.networkLabel') }} </strong>
                    <ULink to="https://www.ebgb.admin.ch/de/leichte-sprache">https://www.ebgb.admin.ch/de/leichte-sprache</ULink>
                </div>
            </div>
        </template>
    </UPopover>
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
    <!-- <UDropdownMenu :items="items" variant="soft">
        <UButton icon="i-lucide-languages" variant="soft" />
    </UDropdownMenu> -->
  </div>
</template>