<script setup lang="ts">
/**
 * Name and instruction form for creating or editing a saved prompt.
 * The parent owns the values (v-model) and decides what "submit" does.
 */
import { SAVED_PROMPT_NAME_MAX_LENGTH } from "~/types/savedPrompt";

defineProps<{ valid: boolean }>();

const emit = defineEmits<{ submit: []; cancel: [] }>();

const name = defineModel<string>("name", { required: true });
const prompt = defineModel<string>("prompt", { required: true });

const { t } = useI18n();
</script>

<template>
    <div class="flex flex-col gap-2">
        <UInput
            v-model="name"
            :maxlength="SAVED_PROMPT_NAME_MAX_LENGTH"
            :placeholder="t('savedPrompts.namePlaceholder')"
            :aria-label="t('savedPrompts.namePlaceholder')"
            class="w-full"
            data-testid="savedPromptFormName"
        />
        <UTextarea
            v-model="prompt"
            :placeholder="t('savedPrompts.promptPlaceholder')"
            :aria-label="t('savedPrompts.promptPlaceholder')"
            :rows="4"
            class="w-full"
            data-testid="savedPromptFormPrompt"
        />
        <div class="flex justify-end gap-2">
            <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                @click="emit('cancel')"
            >
                {{ t("common.cancel") }}
            </UButton>
            <UButton
                size="sm"
                icon="i-lucide-check"
                :disabled="!valid"
                data-testid="savedPromptFormSave"
                @click="emit('submit')"
            >
                {{ t("savedPrompts.save") }}
            </UButton>
        </div>
    </div>
</template>
