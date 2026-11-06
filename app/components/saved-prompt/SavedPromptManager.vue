<script setup lang="ts">
/**
 * Lists the user's saved prompts and lets them apply, create, edit, delete,
 * export and import them. Hosted in a UModal (desktop) or UDrawer (mobile).
 */
import type { SavedPrompt } from "~/types/savedPrompt";
import { isValidSavedPromptInput } from "~/utils/savedPromptTransfer";

const props = defineProps<{ actionsAreAvailable: boolean }>();

const emit = defineEmits<{ apply: [prompt: string] }>();

const { t } = useI18n();
const { prompts, load, save, update, remove, exportToJson, importFromFile } =
    useSavedPrompts();

/** Marker for the "new prompt" form in `editingId`. */
const NEW_PROMPT = "new";

/** Id of the prompt being edited, NEW_PROMPT for the create form, "" when closed. */
const editingId = ref("");
const draftName = ref("");
const draftPrompt = ref("");
/** Id of the prompt whose delete confirmation is showing, "" when none. */
const confirmDeleteId = ref("");
const fileInputRef = ref<HTMLInputElement>();

const draftIsValid = computed(() =>
    isValidSavedPromptInput(draftName.value, draftPrompt.value),
);

onMounted(load);

/** Opens the empty form for a new prompt. */
function startCreate(): void {
    editingId.value = NEW_PROMPT;
    draftName.value = "";
    draftPrompt.value = "";
    confirmDeleteId.value = "";
}

/** Opens the form for an existing prompt. */
function startEdit(prompt: SavedPrompt): void {
    editingId.value = prompt.id;
    draftName.value = prompt.name;
    draftPrompt.value = prompt.prompt;
    confirmDeleteId.value = "";
}

/** Closes the form without saving. */
function cancelEdit(): void {
    editingId.value = "";
}

/** Saves the open form as a new or updated prompt. */
async function submitDraft(): Promise<void> {
    if (!draftIsValid.value) {
        return;
    }
    const input = { name: draftName.value, prompt: draftPrompt.value };
    const ok =
        editingId.value === NEW_PROMPT
            ? await save(input)
            : await update(editingId.value, input);
    if (ok) {
        editingId.value = "";
    }
}

/** Deletes a prompt after inline confirmation. */
async function confirmDelete(id: string): Promise<void> {
    await remove(id);
    confirmDeleteId.value = "";
}

/** First line of a prompt, for the one-line preview. */
function firstLine(text: string): string {
    return text.split("\n")[0] ?? "";
}

/** Opens the browser's file picker for an import file. */
function triggerImport(): void {
    fileInputRef.value?.click();
}

/** Imports the picked file and resets the input so the same file can be picked again. */
async function onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) {
        await importFromFile(file);
    }
}
</script>

<template>
    <div class="flex flex-col gap-3" data-testid="savedPromptManager">
        <div class="flex flex-wrap items-center gap-2">
            <UButton
                size="sm"
                icon="i-lucide-plus"
                data-testid="savedPromptNew"
                @click="startCreate"
            >
                {{ t("savedPrompts.new") }}
            </UButton>
            <div class="flex-1" />
            <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-lucide-download"
                data-testid="savedPromptExport"
                @click="exportToJson"
            >
                {{ t("savedPrompts.export") }}
            </UButton>
            <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-lucide-upload"
                @click="triggerImport"
            >
                {{ t("savedPrompts.import") }}
            </UButton>
            <input
                ref="fileInputRef"
                type="file"
                class="hidden"
                accept="application/json,.json"
                data-testid="savedPromptImportInput"
                @change="onImportFile"
            >
        </div>

        <SavedPromptForm
            v-if="editingId === NEW_PROMPT"
            v-model:name="draftName"
            v-model:prompt="draftPrompt"
            :valid="draftIsValid"
            @submit="submitDraft"
            @cancel="cancelEdit"
        />

        <p
            v-if="prompts.length === 0 && editingId !== NEW_PROMPT"
            class="text-sm text-muted"
        >
            {{ t("savedPrompts.empty") }}
        </p>

        <ul v-else class="flex flex-col divide-y divide-default">
            <li
                v-for="prompt in prompts"
                :key="prompt.id"
                class="py-2"
                data-testid="savedPromptRow"
            >
                <SavedPromptForm
                    v-if="editingId === prompt.id"
                    v-model:name="draftName"
                    v-model:prompt="draftPrompt"
                    :valid="draftIsValid"
                    @submit="submitDraft"
                    @cancel="cancelEdit"
                />

                <div
                    v-else-if="confirmDeleteId === prompt.id"
                    class="flex items-center gap-2"
                >
                    <span class="flex-1 text-sm">
                        {{ t("savedPrompts.confirmDelete") }}
                    </span>
                    <UButton
                        size="sm"
                        color="error"
                        icon="i-lucide-trash-2"
                        data-testid="savedPromptConfirmDelete"
                        @click="confirmDelete(prompt.id)"
                    >
                        {{ t("common.delete") }}
                    </UButton>
                    <UButton
                        size="sm"
                        variant="ghost"
                        color="neutral"
                        @click="confirmDeleteId = ''"
                    >
                        {{ t("common.cancel") }}
                    </UButton>
                </div>

                <div v-else class="flex items-center gap-1">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">
                            {{ prompt.name }}
                        </p>
                        <p class="text-xs text-muted truncate">
                            {{ firstLine(prompt.prompt) }}
                        </p>
                    </div>
                    <UTooltip :text="t('actions.apply')">
                        <UButton
                            size="sm"
                            variant="ghost"
                            color="neutral"
                            icon="i-lucide-play"
                            :aria-label="t('actions.apply')"
                            :disabled="!props.actionsAreAvailable"
                            data-testid="savedPromptApply"
                            @click="emit('apply', prompt.prompt)"
                        />
                    </UTooltip>
                    <UTooltip :text="t('common.edit')">
                        <UButton
                            size="sm"
                            variant="ghost"
                            color="neutral"
                            icon="i-lucide-pencil"
                            :aria-label="t('common.edit')"
                            data-testid="savedPromptEdit"
                            @click="startEdit(prompt)"
                        />
                    </UTooltip>
                    <UTooltip :text="t('common.delete')">
                        <UButton
                            size="sm"
                            variant="ghost"
                            color="error"
                            icon="i-lucide-trash-2"
                            :aria-label="t('common.delete')"
                            data-testid="savedPromptDelete"
                            @click="confirmDeleteId = prompt.id"
                        />
                    </UTooltip>
                </div>
            </li>
        </ul>
    </div>
</template>
