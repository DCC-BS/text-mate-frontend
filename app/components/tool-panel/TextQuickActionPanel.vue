<script lang="ts" setup>
import { apiStreamFetch, isApiError } from "@dcc-bs/communication.bs.js";
import {
    Cmds,
    ExecuteTextActionCommand,
    type ToggleLockEditorCommand,
} from "~/assets/models/commands";
import type { TextActions } from "~~/shared/text-actions";
import CustomAction from "./quick-action/CustomAction.vue";
import FormalityAction from "./quick-action/FormalityAction.vue";
import MediumAction from "./quick-action/MediumAction.vue";
import SocialMediaAction from "./quick-action/SocialMediaAction.vue";
import SummarizeAction from "./quick-action/SummarizeAction.vue";
import CharacterSpeechAction from "./quick-action/CharacterSpeechAction.vue";

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

async function applyAction(
    action: TextActions,
    config?: string,
): Promise<void> {
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

        const response = await apiStreamFetch("/api/quick-action", {
            method: "POST",
            body: {
                action,
                text: props.text,
                options: `${config ?? ""};language code: ${selectedLanguage.value}`,
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

        executeCommand(new ExecuteTextActionCommand(response));
    } finally {
        isLocked.value = false;
    }
}
</script>

<template>
    <div class="flex justify-center gap-2 flex-wrap" data-tour="quick-actions">
        <UPopover mode="hover">
            <UButton variant="link" :disabled="!actionsAreAvailable" @click="applyAction('plain_language')">
                {{ t("editor.plain_language") }}
            </UButton>
            <template #content>
                <div class="max-w-[50vw] p-2">
                    <div>
                        {{ t("plain-language.notice") }}
                    </div>
                </div>
            </template>
        </UPopover>
        <UButton variant="link" :disabled="!actionsAreAvailable" @click="applyAction('bullet_points')">
            {{ t("editor.bullet_points") }}
        </UButton>
        <UButton variant="link" :disabled="!actionsAreAvailable" @click="applyAction('proofread')">
            {{ t("editor.proofread") }}
        </UButton>
        <SummarizeAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
        <CharacterSpeechAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
        <SocialMediaAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
        <FormalityAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
        <MediumAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
        <CustomAction :actions-are-available="actionsAreAvailable" @apply-action="applyAction" />
    </div>
</template>
