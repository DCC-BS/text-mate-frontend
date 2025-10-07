<script lang="ts" setup>
import { ToggleLockEditorCommand } from "~/assets/models/commands";
import type { TextActions } from "~/assets/models/text-actions";

interface InputProps {
    text: string;
}

const props = defineProps<InputProps>();

const { t } = useI18n();

const isRewriting = ref<boolean>(false);

const actionsAreAvailable = computed(() => !isRewriting.value);
const { addProgress, removeProgress } = useUseProgressIndication();
const { executeCommand } = useCommandBus();
const toast = useToast();

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
        addProgress("quick-action", {
            icon: "i-lucide-text-search",
            title: t("status.quickAction"),
        });
        isRewriting.value = true;

        const response = await apiStreamfetch("/api/quick-action", {
            method: "POST",
            body: {
                action,
                text: props.text,
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

        const reader = response.getReader();
        // const oldText = props.editor.state.doc.textBetween(from, to);

        // const newText = await applyStreamToEditor(
        //     reader,
        //     props.editor,
        //     from,
        //     to,
        // );

        await executeCommand(new ToggleLockEditorCommand(false));

        // await executeCommand(
        //     new RequestChangesCommand(
        //         oldText,
        //         newText,
        //         from,
        //         from + newText.length + 1,
        //     ),
        // );
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
            variant="link"
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
    <UButton
        variant="link"
        :disabled="!actionsAreAvailable"
        @click="applyAction('bullet_points')">
        {{ t('editor.bullet_points') }}
    </UButton>
    <UButton
        variant="link"
        :disabled="!actionsAreAvailable"
        @click="applyAction('summarize')">
        {{ t('editor.summarize') }}
    </UButton>
    <UButton
        variant="link"
        :disabled="!actionsAreAvailable"
        @click="applyAction('social_mediafy')">
        {{ t('editor.social_mediafy') }}
    </UButton>
    <!-- <UDropdownMenu :items="items" variant="soft">
        <UButton icon="i-lucide-languages" variant="soft" />
    </UDropdownMenu> -->
  </div>
</template>