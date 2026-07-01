<script lang="ts" setup>
import {
    ApplyTextAtOffsetCommand,
    Cmds,
    type RegisterDiffCommand,
    type RejectDiffCommand,
    RetryQuickActionCommand,
} from "~/assets/models/commands";
import type { DiffHunk } from "~/types/diff";
import DiffViewer from "../diff/DiffViewer.vue";

interface Props {
    text: string;
}

const props = defineProps<Props>();

const { onCommand, executeCommand } = useCommandBus();

/**
 * Snapshot of the editor text captured at the moment a rewrite was registered
 * (i.e. before the streaming rewrite mutated it). Acts as the diff baseline.
 */
const originalText = ref("");
/**
 * Bumped on every `RegisterDiffCommand` to remount the core `DiffViewer` and
 * guarantee a fresh accept/reject state — even when two consecutive rewrites
 * share the same original text (e.g. a retry).
 */
const revision = ref(0);

const diffViewerRef = ref<InstanceType<typeof DiffViewer> | null>(null);

watch(
    () => props.text,
    () => {
        if (props.text.trim() === "") {
            originalText.value = "";
        }
    },
);

onCommand<RegisterDiffCommand>(Cmds.RegisterDiffCommand, async (cmd) => {
    originalText.value = cmd.oldText;
    revision.value++;
});

onCommand<RejectDiffCommand>(Cmds.RejectDiffCommand, async (cmd) => {
    // Full revert of the whole rewrite back to the original text: replay every
    // change hunk in reverse document order so earlier offsets stay valid as
    // later spans are restored.
    const hunks = diffViewerRef.value?.getAllChangeHunks() ?? [];
    for (const hunk of [...hunks].sort((a, b) => b.from - a.from)) {
        await executeCommand(
            new ApplyTextAtOffsetCommand(
                hunk.removedText,
                hunk.from,
                hunk.to,
                cmd.addToHistory,
            ),
        );
    }
    originalText.value = "";
});

/**
 * Reverts a single hunk in the editor. The live `text` prop then updates, the
 * core rebuilds its segments, and the reverted span disappears from the diff
 * while remaining counted in the progress subtitle.
 */
function onRejectHunk(hunk: DiffHunk): void {
    executeCommand(
        new ApplyTextAtOffsetCommand(hunk.removedText, hunk.from, hunk.to),
    );

    if (diffViewerRef.value?.areAllHunksResolved()) {
        originalText.value = "";
    }
}

function onRejectAll(hunks: DiffHunk[]): void {
    // Reset the view immediately for instant feedback, then revert each hunk
    // against the already-captured offsets. Reverse document order keeps the
    // earlier ranges valid as later spans are restored.
    originalText.value = "";
    for (const hunk of [...hunks].sort((a, b) => b.from - a.from)) {
        executeCommand(
            new ApplyTextAtOffsetCommand(hunk.removedText, hunk.from, hunk.to),
        );
    }
}

/**
 * Accepting is a no-op for the editor: the rewrite was already applied live,
 * so "accept" simply means "keep the corrected text as-is".
 */
function onAcceptHunk(_hunk: DiffHunk): void {
    // intentionally empty

    if (diffViewerRef.value?.areAllHunksResolved()) {
        originalText.value = "";
    }
}

/**
 * All changes are kept as-is; reset the diff view to end the review session.
 */
function onAcceptAll(_hunks: DiffHunk[]): void {
    originalText.value = "";
}

function retry(): void {
    executeCommand(new RetryQuickActionCommand());
}
</script>

<template>
    <div
        class="absolute inset-0 overflow-y-auto p-1"
        data-tour="rewrite-toolpanel"
    >
        <DiffViewer
            v-if="originalText"
            :key="revision"
            ref="diffViewerRef"
            :original-text="originalText"
            :corrected-text="text"
            i18n-prefix="rewrite-diff-viewer"
            :title="$t('rewrite-diff-viewer.title')"
            @accept-hunk="onAcceptHunk"
            @reject-hunk="onRejectHunk"
            @accept-all="onAcceptAll"
            @reject-all="onRejectAll"
        >
            <template #actions>
                <UTooltip :text="$t('rewrite-diff-viewer.retry')">
                    <UButton
                        variant="outline"
                        color="neutral"
                        size="xs"
                        square
                        icon="i-lucide-rotate-ccw"
                        data-tour="retry-quick-action"
                        @click="retry"
                    />
                </UTooltip>
            </template>
        </DiffViewer>
        <div v-else class="text-center text-muted mt-6 text-sm">
            {{ $t("rewrite-diff-viewer.noChangesYet") }}
        </div>
    </div>
</template>
