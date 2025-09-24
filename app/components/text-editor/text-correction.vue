<script lang="ts" setup>
// biome-ignore lint/style/useImportType: use in the vue template
import { ApplyCorrectionCommand } from "~/assets/models/commands";
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

function addWord(word: string) {
    userDictionaryQuery.addWord(word);
}
</script>

<template>
  <UPopover :open="!!props.hoverBlock" :content="{onOpenAutoFocus: (e: Event) => e.preventDefault()}" class="absolute">
      <div class="absolute pointer-events-none select-none touch-none" :style="{
          top: props.relativeHoverRect?.top + 'px', 
          left: props.relativeHoverRect?.left + 'px',
          width: props.relativeHoverRect?.width + 'px',
          height: props.relativeHoverRect?.height + 'px',}">
      </div>

      <template #content>
          <div
              v-if="hoverBlock && hoverBlock.corrected.length > 0"
              class="flex flex-wrap gap-1 justify-center p-2">
              <UButton
                  v-for="correction in hoverBlock.corrected.slice(0, 5)" :key="correction"
                  @click="applyCorrection(new ApplyCorrectionCommand(hoverBlock, correction))">
                  {{ correction }}
              </UButton>
            <UButton color="info" icon="i-heroicons-plus-circle" @click="addWord(hoverBlock?.original)">
                {{ t("text-editor.addWordToDictionary") }}
            </UButton>
          </div>
      </template>
  </UPopover>
</template>