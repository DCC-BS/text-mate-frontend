<script lang="ts" setup>
import { match } from "ts-pattern";
import {
    ApplyCorrectionCommand,
    Cmds,
    type CorrectedSentenceChangedCommand,
    type JumpToBlockCommand,
} from "~/assets/models/commands";
import type {
    CorrectedSentence,
    TextCorrectionBlock,
} from "~/assets/models/text-correction";
import { makeCorrectedSentenceAbsolute } from "~/assets/services/CorrectionService";

// composables
const { t } = useI18n();
const { registerHandler, unregisterHandler, executeCommand } = useCommandBus();

// refs
const selectedBlock = ref<TextCorrectionBlock | null>(null);

// computed
const correctedSentence = ref<Record<string, CorrectedSentence>>({});
const blocks = computed(() => {
    return Object.values(correctedSentence.value)
        .flatMap((sentence) => makeCorrectedSentenceAbsolute(sentence).blocks)
        .sort((a, b) => {
            return a.offset - b.offset;
        });
});

// life cycle
onMounted(() => {
    registerHandler(
        Cmds.CorrectedSentenceChangedCommand,
        handleCorrectedSentenceChangedCommand,
    );
    registerHandler(Cmds.JumpToBlockCommand, jumpToBlock);
});

onUnmounted(() => {
    unregisterHandler(Cmds.JumpToBlockCommand, jumpToBlock);
    unregisterHandler(
        Cmds.CorrectedSentenceChangedCommand,
        handleCorrectedSentenceChangedCommand,
    );
});

// functions
async function handleCorrectedSentenceChangedCommand(
    command: CorrectedSentenceChangedCommand,
) {
    match(command.change)
        .with("add", () => {
            correctedSentence.value[command.correctedSentence.id] =
                command.correctedSentence;
        })
        .with("remove", () => {
            delete correctedSentence.value[command.correctedSentence.id];
        })
        .with("update", () => {
            correctedSentence.value[command.correctedSentence.id] =
                command.correctedSentence;
        });
}

async function jumpToBlock(command: JumpToBlockCommand) {
    selectBlock(command.block);

    const blockElement = document.getElementById(
        `block-${command.block.offset}`,
    );
    if (blockElement) {
        scrollToBlock(blockElement);
    }
}

function selectBlock(block: TextCorrectionBlock) {
    selectedBlock.value = block;
}

function scrollToBlock(blockElement: HTMLElement) {
    const container = blockElement.closest(
        ".scrollable-container",
    ) as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = blockElement.getBoundingClientRect();
    const relativeTop =
        elementRect.top - containerRect.top + container.scrollTop;
    const centerOffset = (containerRect.height - elementRect.height) / 2;

    const targetScrollTop = relativeTop - centerOffset;

    container.scrollTo({
        top: targetScrollTop,
        behavior: "smooth",
    });

    // Fallback for browsers that don't support smooth scrolling
    if (!("scrollBehavior" in document.documentElement.style)) {
        container.scrollTop = targetScrollTop;
    }
}

function applyBlock(block: TextCorrectionBlock, corrected: string) {
    executeCommand(new ApplyCorrectionCommand(block, corrected));
}
</script>

<template>
    <div class="flex justify-stretch items-stretch gap-2 flex-wrap w-full">
        <ToolPanelLanguageSelect class="grow"/>
        <ToolPanelUserDictionary class="grow"/>
    </div>

    <div v-if="blocks.length > 0">
        <div class="text-lg">{{ t('problems.title') }}</div>
        <div>
            <template v-for="block in blocks">
                <UCard :id="`block-${block.offset}`" class="m-2">
                    <div @click="selectBlock(block)">
                        {{ block.original.replace(/\s/g, '_') }} - {{ block.explanation }}
                    </div>

                    <div v-if="selectedBlock?.offset == block.offset">
                        <div class="flex gap-2 flex-wrap mt-1">
                            <UButton v-for="corrected in block.corrected" @click="applyBlock(block, corrected)">
                                {{ corrected }}
                            </UButton>
                        </div>
                    </div>
                </UCard>
            </template>
        </div>
    </div>
    <div v-else>
        <div class="text-lg">{{ t('problems.noProblems') }}</div>
    </div>
</template>
