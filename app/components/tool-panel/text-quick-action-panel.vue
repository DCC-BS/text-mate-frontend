<script lang="ts" setup>
import {
    Cmds,
    ExecuteTextActionCommand,
    type ToggleLockEditorCommand,
} from "~/assets/models/commands";
import type { TextActions } from "~~/shared/text-actions";
import SummarizeAction from "./quick-action/summarize-action.vue";
import SocialMediaAction from "./quick-action/social-media-action.vue";
import MediumAction from "./quick-action/medium-action.vue";
import FormalityAction from "./quick-action/formality-action.vue";
import CustomAction from "./quick-action/custom-action.vue";

interface InputProps {
    text: string;
}

const props = defineProps<InputProps>();

const { t } = useI18n();

const isLocked = ref<boolean>(false);
const selectedLanguage = useCookie<string>("selected-language", {
    default: () => "auto",
});

const actionsAreAvailable = computed(
    () => !isLocked.value && props.text.trim().length > 0,
);
const { executeCommand, onCommand } = useCommandBus();
const toast = useToast();

onCommand<ToggleLockEditorCommand>(
    Cmds.ToggleLockEditorCommand,
    async (command) => {
        isLocked.value = command.locked;
    },
);

async function applyAction(action: TextActions, config?: string): Promise<void> {
    if (!actionsAreAvailable.value) {
        toast.add({
            title: "Error",
            description: "No text to process",
            color: "error",
            icon: "i-lucide-circle-alert",
        });
        return;
    }

    try {
        isLocked.value = true;

        const response = await apiStreamfetch("/api/quick-action", {
            method: "POST",
            body: {
                action,
                text: props.text,
                options: `${config ?? ''};\nlanguage code: ${selectedLanguage.value}`,
            },
        });

        if (isApiError(response)) {
            toast.add({
                title: "Error",
                description:
                    t(`errors.${response.errorId}`) || response.message,
                color: "error",
                icon: "i-lucide-circle-alert",
            });
            return;
        }

        executeCommand(
            new ExecuteTextActionCommand(response, 1, props.text.length + 1),
        );
    } finally {
        isLocked.value = false;
    }
}
</script>

<template>
    <div class="flex justify-center gap-2 flex-wrap" data-tour="quick-actions">
        <UPopover mode="hover">
            <UButton variant="link" :disabled="!actionsAreAvailable" @click="applyAction('plain_language')">
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
        <UButton variant="link" :disabled="!actionsAreAvailable" @click="applyAction('bullet_points')">
            {{ t('editor.bullet_points') }}
        </UButton>
        <SummarizeAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
        <SocialMediaAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
        <FormalityAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
        <MediumAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
        <CustomAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
    </div>
</template>