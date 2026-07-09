<script lang="ts" setup>
import type { AdvisorPhase, AdvisorThread } from "~/assets/models/advisor";
import {
    AddUserReviewCommand,
    ChangeActiveThreadId,
} from "~/assets/models/commands";
import BaseEditor from "~/components/editor/BaseEditor.vue";
import { useAdvisorEditor } from "~/composables/useAdvisorEditor";
import { selectionInfo } from "~/utils/advisorText";
import { threadWithSameRange } from "~/utils/advisorThreads";

interface InputProps {
    phase: AdvisorPhase;
    threads: AdvisorThread[];
    activeThreadId: string | null;
}

const props = defineProps<InputProps>();

const { t } = useI18n();
const { executeCommand } = useCommandBus();

const text = defineModel("text", { default: "" });

const { selection, editor } = useAdvisorEditor(
    toRef(props, "threads"),
    toRef(props, "activeThreadId"),
    10000,
    toRef(props, "phase"),
    text,
);

type Bubble = { visible: boolean; top: number; left: number };
const bubble = ref<Bubble>({ visible: false, top: 0, left: 0 });

const isReview = computed(() =>
    ["review", "diff", "done"].includes(props.phase),
);

/**
 * Id of the existing thread whose range is exactly the current selection,
 * if any. Drives both the bubble label/icon and the reply-vs-new-thread
 * dispatch in {@link addNoteOrReply}, so the two can never drift apart.
 */
const replyTargetId = computed<string | null>(() => {
    const sel = selection.value;
    const ed = editor.value;
    if (!sel || !ed) {
        return null;
    }
    const info = selectionInfo(ed.state.doc, sel.from, sel.to);
    if (!info) {
        return null;
    }
    return threadWithSameRange(props.threads, info.startOffset, info.endOffset);
});

// Scroll the active thread's decoration into view when it changes from
// elsewhere (e.g. selecting a ThreadCard). Decorations live inside the
// ProseMirror DOM, so query the editor's view directly.
watch(
    () => props.activeThreadId,
    (id) => {
        if (!id) {
            return;
        }
        nextTick(() => {
            const el = editor.value?.view.dom.querySelector(
                `[data-thread-id="${CSS.escape(id)}"]`,
            ) as HTMLElement | null;
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    },
);

watch(
    selection,
    () => {
        if (!isReview.value || props.phase !== "review") {
            bubble.value.visible = false;
            return;
        }
        const sel = selection.value;
        if (!sel || sel.text.trim().length < 1) {
            bubble.value.visible = false;
            return;
        }
        const rect = selectionRect();
        if (!rect) {
            bubble.value.visible = false;
            return;
        }
        bubble.value = {
            visible: true,
            top: rect.top - 38,
            left: rect.left + rect.width / 2,
        };
    },
    { flush: "post" },
);

function selectionRect(): DOMRect | null {
    const domSel = window.getSelection();
    if (!domSel || domSel.rangeCount === 0) {
        return null;
    }
    const range = domSel.getRangeAt(0);
    if (range.collapsed) {
        return null;
    }
    return range.getBoundingClientRect();
}

function addNoteOrReply(): void {
    const sel = selection.value;
    const ed = editor.value;
    const targetId = replyTargetId.value;
    if (targetId) {
        // Exact-range match with an existing thread — treat as a reply focus.
        executeCommand(new ChangeActiveThreadId(targetId));
    } else if (sel && ed) {
        const info = selectionInfo(ed.state.doc, sel.from, sel.to);
        if (!info) {
            return;
        }
        executeCommand(
            new AddUserReviewCommand({
                start: info.startOffset,
                end: info.endOffset,
            }),
        );
    } else {
        return;
    }

    window.getSelection()?.removeAllRanges();
    bubble.value.visible = false;
}

function clearBubbleOnExternalClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-advisor-bubble]")) {
        return;
    }
    if (target?.closest(".advisor-mark")) {
        return;
    }
    bubble.value.visible = false;
}

onMounted(() => {
    document.addEventListener("mousedown", clearBubbleOnExternalClick);
});
onBeforeUnmount(() => {
    document.removeEventListener("mousedown", clearBubbleOnExternalClick);
});
</script>

<template>
    <BaseEditor
        :editor="editor"
        :text="text"
        :limit="10000"
        :selection="selection"
        :readonly="phase !== 'edit'"
        tour="advisor-editor"
    >
        <template #bubble>
            <Teleport to="body">
                <button
                    v-if="bubble.visible"
                    type="button"
                    data-advisor-bubble
                    class="fixed z-50 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-inverted text-xs font-medium shadow-md"
                    :style="{ top: `${bubble.top}px`, left: `${bubble.left}px` }"
                    @mousedown.prevent
                    @click="addNoteOrReply"
                >
                    <UIcon
                        :name="
                            replyTargetId
                                ? 'i-lucide-message-square'
                                : 'i-lucide-message-square-plus'
                        "
                        class="text-sm"
                    />
                    {{ replyTargetId
                            ? t("advisor.reply")
                            : t("advisor.addNote") }}
                </button>
            </Teleport>
        </template>
    </BaseEditor>
</template>
