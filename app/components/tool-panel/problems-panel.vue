<script lang="ts" setup>
import { AnimatePresence, motion } from "motion-v";
import {
    ApplyCorrectionCommand,
    Cmds,
    InvalidateCorrectionCommand,
    type JumpToBlockCommand,
} from "~/assets/models/commands";
import type { TextCorrectionBlock } from "~/assets/models/text-correction";
import { UserDictionaryQuery } from "~/assets/queries/user_dictionary.query";
import { useCorrection } from "~/composables/correction";

// composables
const { t } = useI18n();
const { executeCommand, onCommand } = useCommandBus();
const { blocks } = useCorrection();
const userDictionaryQuery = useService(UserDictionaryQuery);

// refs
const selectedBlock = ref<TextCorrectionBlock | null>(null);
const currentBlockIndex = ref(0);
const currentBlock = computed(() => {
    return blocks.value[currentBlockIndex.value];
});

watch(blocks, () => {
    if (currentBlockIndex.value >= blocks.value.length) {
        currentBlockIndex.value = Math.max(0, blocks.value.length - 1);
    }
});

onCommand(Cmds.JumpToBlockCommand, async (command: JumpToBlockCommand) => {
    const index = blocks.value.findIndex(
        (b) => b.offset === command.block.offset,
    );
    currentBlockIndex.value = index === -1 ? 0 : index;
});

async function applyBlock(block: TextCorrectionBlock, corrected: string) {
    await executeCommand(new ApplyCorrectionCommand(block, corrected));
}

async function addWord(word: string) {
    await userDictionaryQuery.addWord(word);
    await executeCommand(new InvalidateCorrectionCommand());
}
</script>

<template>
    <div v-if="blocks.length > 0" class="p-2">
        <div class="flex justify-between">
            <h3 class="text-lg font-semibold">{{ t('problems.title') }}</h3>
            <div class="flex gap-1">
                <UButton :disabled="currentBlockIndex === 0" variant="link" color="neutral" icon="i-lucide-chevron-left"
                    @click="currentBlockIndex = Math.max(0, currentBlockIndex - 1)" />
                <UButton :disabled="currentBlockIndex >= blocks.length - 1" variant="link" color="neutral"
                    icon="i-lucide-chevron-right"
                    @click="currentBlockIndex = Math.min(blocks.length - 1, currentBlockIndex + 1)" />
            </div>
        </div>
        <AnimatePresence mode="popLayout">
            <div v-if="currentBlock">
                <motion.div :key="currentBlock.id" :initial="{ opacity: 0, x: -20 }" :animate="{ opacity: 1, x: 0 }"
                    :exit="{ opacity: 0, x: 20 }">
                    <div class="mt-2 text-2xl font-bold">{{ currentBlock.original.replace(/\s/g, '_') }}</div>

                    <div class="flex gap-2 flex-wrap mt-1">
                        <UButton v-for="corrected in currentBlock.corrected"
                            @click="applyBlock(currentBlock, corrected)" variant="link">
                            {{ corrected }}
                        </UButton>
                    </div>

                    <div class="text-gray-600 my-1">
                        {{ currentBlock.explanation }}
                    </div>

                    <UButton variant="link" color="neutral" icon="i-lucide-book-plus"
                        @click="addWord(currentBlock.original)">
                        {{ t('problems.addToDictionary', { word: currentBlock.original }) }}
                    </UButton>
                </motion.div>
            </div>
        </AnimatePresence>
    </div>
    <div v-else class="p-2">
        <h3 class="text-lg font-semibold">{{ t('problems.title') }}</h3>
        <div class="text-lg">{{ t('problems.noProblems') }}</div>
    </div>
</template>
