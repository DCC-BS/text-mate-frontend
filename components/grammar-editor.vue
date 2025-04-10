<script setup lang="ts">
import type { Range } from "@tiptap/vue-3";
import {
    JumpToBlockCommand,
    RewriteTextCommand,
} from "~/assets/models/commands";
import type { TextCorrectionBlock } from "~/assets/models/text-correction";
import { CorrectionService } from "~/assets/services/CorrectionService";
import { TaskScheduler } from "~/assets/services/TaskScheduler";
import TextEditor from "./text-editor.vue";
import ToolPanel from "./tool-panel.vue";

// refs
const userText = ref("");
const blocks = ref<TextCorrectionBlock[]>([]);
const taskScheduler = new TaskScheduler();

const rewriteRange = ref<Range>();

// composables
const router = useRouter();
const viewport = useViewport();
const { addProgress, removeProgress } = useUseProgressIndication();
const { t } = useI18n();
const { executeCommand } = useCommandBus();
const { sendError } = useUseErrorDialog();
const logger = useLogger();

// todo create a composable
const correctionService = new CorrectionService(logger, sendError);

// check if the query param clipboard is true
const clipboard = router.currentRoute.value.query.clipboard;

// life cycle
onMounted(async () => {
    // Wait for next tick to ensure text editor is fully mounted
    await nextTick();

    if (clipboard && userText.value === "") {
        const text = await navigator.clipboard.readText();
        userText.value = text;
    }
});

// listeners
watch(userText, (newText) => {
    taskScheduler.enqueue((signal: AbortSignal) =>
        correctText(newText, signal),
    );
    rewriteRange.value = undefined;

    // ends with any whitespace
    if (newText.endsWith(" ") || newText.endsWith("\n")) {
        taskScheduler.runLast();
    }
});

// functions
async function correctText(text: string, signal: AbortSignal) {
    addProgress("correcting", {
        icon: "i-heroicons-pencil",
        title: t("status.correctingText"),
    });
    try {
        await correctionService.correctText(text, signal, blocks);
    } finally {
        removeProgress("correcting");
    }
}

function onCorrectionApplied(block: TextCorrectionBlock, corrected: string) {
    blocks.value = blocks.value.filter((b) => b.offset !== block.offset);
}

function onRewriteText(text: string, range: Range) {
    executeCommand(new RewriteTextCommand(text, range));
}

function onBlockClick(block: TextCorrectionBlock) {
    executeCommand(new JumpToBlockCommand(block));
}
</script>

<template>
    <div class="h-[90vh]">
        <SplitView :is-horizontal="viewport.isLessThan('md')" a-pane-style="min-w-[250px] min-h-[200px]"
            b-pane-style="min-w-[300px] min-h-[200px]">
            <template #a>
                <client-only>
                    <div class="w-full h-full relative">
                        <TextEditor v-model="userText" :blocks="blocks" @block-click="onBlockClick"
                            @rewrite-text="onRewriteText" @correction-applied="onCorrectionApplied" />
                    </div>
                </client-only>
            </template>
            <template #b>
                <div>
                    <ToolPanel :blocks="blocks" :text="userText" />
                </div>
            </template>
        </SplitView>
    </div>
    <div class="fixed bottom-5 left-0 right-0">
        <ProgressIndication />
    </div>
</template>
