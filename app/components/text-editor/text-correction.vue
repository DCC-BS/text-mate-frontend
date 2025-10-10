<script lang="ts" setup>
// biome-ignore lint/style/useImportType: use in the vue template
import { ApplyCorrectionCommand, InvalidateCorrectionCommand } from "~/assets/models/commands";
import type { TextCorrectionBlock } from "~/assets/models/text-correction";
import { UserDictionaryQuery } from "~/assets/queries/user_dictionary.query";

type Rect = {
    top: number;
    left: number;
    width: number;
    height: number;
};

interface InputProps {
    hoverBlock: TextCorrectionBlock | undefined;
    relativeHoverRect: Rect | undefined;
}

const props = defineProps<InputProps>();

const { executeCommand } = useCommandBus();
const { t } = useI18n();

const userDictionaryQuery = useService(UserDictionaryQuery);

async function applyCorrection(command: ApplyCorrectionCommand) {
    await executeCommand(command);
}

async function addWord(word: string) {
    await userDictionaryQuery.addWord(word);
    await executeCommand(new InvalidateCorrectionCommand());
}
</script>

<template>
    <UPopover :open="!!props.hoverBlock" :content="{ onOpenAutoFocus: (e: Event) => e.preventDefault() }"
        class="absolute">
        <div class="absolute pointer-events-none select-none touch-none" :style="{
            top: props.relativeHoverRect?.top + 'px',
            left: props.relativeHoverRect?.left + 'px',
            width: props.relativeHoverRect?.width + 'px',
            height: props.relativeHoverRect?.height + 'px',
        }">
        </div>

        <template #content>
            <div v-if="hoverBlock && hoverBlock.corrected.length > 0"
                class="flex flex-col p-2 rounded-md ring-1 ring-gray-400">
                <UButton v-for="correction in hoverBlock.corrected.slice(0, 5)" :key="correction" variant="link"
                    color="neutral" @click="applyCorrection(new ApplyCorrectionCommand(hoverBlock, correction))">
                    {{ correction }}
                </UButton>

                <UTooltip :text="t('text-editor.addWordToDictionary')">
                    <UButton color="neutral" variant="link" icon="i-lucide-book-plus"
                        @click="addWord(hoverBlock?.original)">
                    </UButton>
                </UTooltip>
            </div>
        </template>
    </UPopover>
</template>