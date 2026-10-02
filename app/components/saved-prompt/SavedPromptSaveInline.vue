<script setup lang="ts">
/**
 * "Als Prompt speichern" control for the custom instructions drawer/sheet.
 * Expands into a name field and saves the current instruction text.
 */
import {
    isValidSavedPromptInput,
    SAVED_PROMPT_NAME_MAX_LENGTH,
} from "~/types/savedPrompt";

const props = defineProps<{ prompt: string }>();

const { t } = useI18n();
const { save } = useSavedPrompts();

const expanded = ref(false);
const name = ref("");

const canSave = computed(() =>
    isValidSavedPromptInput(name.value, props.prompt),
);

/** Saves the instruction under the entered name and collapses on success. */
async function submit(): Promise<void> {
    if (!canSave.value) {
        return;
    }
    const ok = await save({ name: name.value, prompt: props.prompt });
    if (ok) {
        cancel();
    }
}

/** Collapses the control and clears the name. */
function cancel(): void {
    name.value = "";
    expanded.value = false;
}
</script>

<template>
    <div>
        <UButton
            v-if="!expanded"
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-bookmark-plus"
            :disabled="!prompt.trim()"
            data-testid="savePromptToggle"
            @click="expanded = true"
        >
            {{ t("savedPrompts.saveAsPrompt") }}
        </UButton>
        <div v-else class="flex items-center gap-2">
            <UInput
                v-model="name"
                :maxlength="SAVED_PROMPT_NAME_MAX_LENGTH"
                :placeholder="t('savedPrompts.namePlaceholder')"
                :aria-label="t('savedPrompts.namePlaceholder')"
                class="flex-1"
                autofocus
                data-testid="savePromptName"
                @keydown.enter.prevent="submit"
            />
            <UButton
                size="sm"
                icon="i-lucide-check"
                :disabled="!canSave"
                data-testid="savePromptSubmit"
                @click="submit"
            >
                {{ t("savedPrompts.save") }}
            </UButton>
            <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                :aria-label="t('common.cancel')"
                @click="cancel"
            />
        </div>
    </div>
</template>
