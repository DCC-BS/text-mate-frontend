<script setup lang="ts">
import type { WordExportSettings } from "~/types/wordExport";
import { wordExportSettingsSchema } from "~/utils/wordExportSettings";

// The draft belongs to the caller; only the explicit save action persists it.
const isOpen = defineModel<boolean>("open", { required: true });
const settings = defineModel<WordExportSettings>("settings", {
    required: true,
});
const filename = defineModel<string>("filename", { required: true });
defineProps<{ busy: boolean }>();
const emit = defineEmits<{ export: []; save: [] }>();
const { t } = useI18n();
const valid = computed(function validSettings(): boolean {
    return wordExportSettingsSchema.safeParse(settings.value).success;
});
</script>

<template>
    <UModal
        v-model:open="isOpen"
        :title="t('wordExport.title')"
        :dismissible="!busy"
    >
        <template #body>
            <form
                id="word-export-form"
                class="grid gap-4"
                @submit.prevent="valid && emit('export')"
            >
                <p class="text-sm text-muted">
                    {{ t('wordExport.precedence') }}
                </p>
                <label class="grid gap-1"
                    >{{ t('wordExport.filename') }}
                    <input
                        v-model="filename"
                        data-testid="word-export-filename"
                        class="rounded border border-default p-2 bg-default"
                        :disabled="busy"
                        maxlength="120"
                    >
                </label>
                <label class="grid gap-1"
                    >{{ t('wordExport.fontFamily') }}
                    <input
                        v-model="settings.fontFamily"
                        data-testid="word-export-font"
                        list="word-export-fonts"
                        class="rounded border border-default p-2 bg-default"
                        :disabled="busy"
                        required
                        maxlength="100"
                    >
                    <datalist id="word-export-fonts">
                        <option>Arial</option>
                        <option>Aptos</option>
                        <option>Calibri</option>
                        <option>Times New Roman</option>
                    </datalist>
                </label>
                <label class="grid gap-1"
                    >{{ t('wordExport.fontSize') }}
                    <input
                        v-model.number="settings.fontSize"
                        data-testid="word-export-size"
                        type="number"
                        min="6"
                        max="72"
                        step="0.5"
                        required
                        class="rounded border border-default p-2 bg-default"
                        :disabled="busy"
                    >
                </label>
                <label class="grid gap-1"
                    >{{ t('wordExport.language') }}
                    <select
                        v-model="settings.language"
                        class="rounded border border-default p-2 bg-default"
                        :disabled="busy"
                    >
                        <option value="de-CH">
                            {{ t('wordExport.germanSwiss') }}
                        </option>
                        <option value="en-GB">
                            {{ t('wordExport.english') }}
                        </option>
                    </select>
                </label>
                <label class="grid gap-1"
                    >{{ t('wordExport.lineSpacing') }}
                    <input
                        v-model.number="settings.lineSpacing"
                        data-testid="word-export-spacing"
                        type="number"
                        min="1"
                        max="3"
                        step="0.05"
                        required
                        class="rounded border border-default p-2 bg-default"
                        :disabled="busy"
                    >
                </label>
                <label class="grid gap-1"
                    >{{ t('wordExport.margins') }}
                    <select
                        v-model="settings.marginPreset"
                        data-testid="word-export-margins"
                        class="rounded border border-default p-2 bg-default"
                        :disabled="busy"
                    >
                        <option value="normal">
                            {{ t('wordExport.normal') }}
                        </option>
                        <option value="narrow">
                            {{ t('wordExport.narrow') }}
                        </option>
                        <option value="wide">{{ t('wordExport.wide') }}</option>
                    </select>
                </label>
                <p class="text-sm text-muted">{{ t('wordExport.fontHint') }}</p>
            </form>
        </template>
        <template #footer>
            <div class="flex flex-wrap gap-2 justify-end w-full">
                <UButton
                    color="neutral"
                    variant="outline"
                    :disabled="busy || !valid"
                    @click="emit('save')"
                    >{{ t('wordExport.save') }}</UButton
                >
                <UButton
                    color="neutral"
                    variant="ghost"
                    :disabled="busy"
                    @click="isOpen = false"
                    >{{ t('wordExport.cancel') }}</UButton
                >
                <UButton
                    type="submit"
                    form="word-export-form"
                    data-testid="word-export-submit"
                    :loading="busy"
                    :disabled="busy || !valid"
                    >{{ t('wordExport.export') }}</UButton
                >
            </div>
        </template>
    </UModal>
</template>
