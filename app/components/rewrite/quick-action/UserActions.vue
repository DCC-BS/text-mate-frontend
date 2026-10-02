<script lang="ts" setup>
/**
 * "Meine Aktionen" menu: backend user actions, the prompts saved in this
 * browser (marked "Lokal"), and the entry that opens the prompt manager.
 */
import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type { DropdownMenuItem } from "@nuxt/ui";
import {
    type TextAction,
    TextActionGetOutputSchema,
} from "~~/shared/text-actions";

interface InputProps {
    actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit = defineEmits<{
    "apply-action": [action: string, config?: string];
}>();

const { t } = useI18n();
const { showError } = useUserFeedback();
const logger = useLogger();
const { prompts: savedPrompts, load: loadSavedPrompts } = useSavedPrompts();

const userActions = ref<TextAction[]>([]);
const managerOpen = ref(false);

onMounted(async () => {
    loadSavedPrompts();

    const response = await apiFetch("/api/user-actions", {
        method: "get",
        schema: TextActionGetOutputSchema,
    });

    if (isApiError(response)) {
        logger.error(response, "Failed to load user actions");
        showError(response);
    } else {
        userActions.value = response.actions;
    }
});

/** Applies a saved prompt from the manager and closes it. */
function applySavedPrompt(prompt: string): void {
    managerOpen.value = false;
    emit("apply-action", "custom", prompt);
}

// Three groups: backend actions, local prompts, manage entry. Empty groups are
// left out. The trigger stays enabled so the manager opens on an empty editor;
// the action items are disabled instead.
const items = computed<DropdownMenuItem[][]>(() => {
    const groups: DropdownMenuItem[][] = [];

    if (userActions.value.length > 0) {
        groups.push(
            userActions.value.map(
                (action) =>
                    ({
                        label: action.name,
                        tooltip: action.tooltip,
                        disabled: !props.actionsAreAvailable,
                        onSelect: () => emit("apply-action", action.id),
                    }) satisfies DropdownMenuItem,
            ),
        );
    }

    if (savedPrompts.value.length > 0) {
        groups.push(
            savedPrompts.value.map(
                (prompt) =>
                    ({
                        label: prompt.name,
                        icon: "i-lucide-hard-drive",
                        tooltip: t("savedPrompts.localTooltip"),
                        local: true,
                        disabled: !props.actionsAreAvailable,
                        onSelect: () =>
                            emit("apply-action", "custom", prompt.prompt),
                    }) satisfies DropdownMenuItem,
            ),
        );
    }

    groups.push([
        {
            label: t("savedPrompts.manage"),
            icon: "i-lucide-settings-2",
            onSelect: () => {
                managerOpen.value = true;
            },
        },
    ]);

    return groups;
});
</script>

<template>
    <UDropdownMenu :items="items" :ui="{ content: 'max-w-80' }">
        <UButton
            variant="link"
            color="neutral"
            size="sm"
            data-tour="user-actions"
            data-testid="userActionsMenu"
        >
            {{ t("editor.userActions") }}
        </UButton>
        <template #item-label="{ item }">
            <UTooltip :text="item.tooltip" :disabled="!item.tooltip">
                <span class="block truncate">{{ item.label }}</span>
            </UTooltip>
        </template>
        <template #item-trailing="{ item }">
            <UBadge
                v-if="item.local"
                :label="t('savedPrompts.local')"
                variant="subtle"
                color="neutral"
                size="sm"
            />
        </template>
    </UDropdownMenu>

    <UModal v-model:open="managerOpen" :title="t('savedPrompts.managerTitle')">
        <template #body>
            <SavedPromptManager
                :actions-are-available="props.actionsAreAvailable"
                @apply="applySavedPrompt"
            />
        </template>
    </UModal>
</template>
