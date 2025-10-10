<script lang="ts" setup>
import {
    Cmds,
    ExecuteTextActionCommand,
    type ToggleLockEditorCommand,
} from "~/assets/models/commands";
import type { TextActions } from "~/assets/models/text-actions";

interface InputProps {
    text: string;
    options: string;
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

async function applyAction(action: TextActions): Promise<void> {
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
                options: `${props.options};\nlanguage code: ${selectedLanguage.value}`,
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
    <div class="flex justify-center gap-2 flex-wrap">
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
        <UButton variant="link" :disabled="!actionsAreAvailable" @click="applyAction('summarize')">
            {{ t('editor.summarize') }}
        </UButton>
        <UButton variant="link" :disabled="!actionsAreAvailable" @click="applyAction('social_mediafy')">
            {{ t('editor.social_mediafy') }}
        </UButton>
        <UButton variant="link" :disabled="!actionsAreAvailable" @click="applyAction('rewrite')">
            {{ t('editor.rewrite') }}
        </UButton>
    </div>
</template>