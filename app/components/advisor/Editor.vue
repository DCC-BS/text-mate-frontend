<script lang="ts" setup>
import { EditorContent } from "@tiptap/vue-3";
import type { AdvisorPhase, AdvisorThread } from "~/assets/models/advisor";
import {
    AddUserReviewCommand,
    ChangeActiveThreadId,
} from "~/assets/models/commands";
import { useAdvisorEditor } from "~/composables/useAdvisorEditor";

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

const containerRef = ref<HTMLElement | null>(null);

type Bubble = { visible: boolean; top: number; left: number };
const bubble = ref<Bubble>({ visible: false, top: 0, left: 0 });

const isReview = computed(() =>
    ["review", "diff", "done"].includes(props.phase),
);

// Scroll the active thread's decoration into view when it changes from
// elsewhere (e.g. selecting a ThreadCard). Decorations are rebuilt async
// by the composable's watch, so wait for the DOM to update first.
watch(
    () => props.activeThreadId,
    (id) => {
        if (!id) {
            return;
        }
        nextTick(() => {
            const el = containerRef.value?.querySelector(
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
    const containerRect = containerRef.value?.getBoundingClientRect();
    const rect = range.getBoundingClientRect();
    if (!containerRect) {
        return rect;
    }
    return new DOMRect(rect.left, rect.top, rect.width, rect.height);
}

function addNoteOrReply(): void {
    const sel = selection.value;
    if (!sel) {
        return;
    }
    const overlapId = threadOverlapping(
        props.threads,
        sel.startOffset,
        sel.endOffset,
    );
    if (overlapId) {
        // Overlaps an existing thread — treat as a reply focus.
        executeCommand(new ChangeActiveThreadId(overlapId));
    } else {
        executeCommand(
            new AddUserReviewCommand({
                start: sel.startOffset,
                end: sel.endOffset,
            }),
        );
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

const wordCount = computed(
    () => editor.value?.storage.characterCount?.words() ?? 0,
);
</script>

<template>
    <div
        ref="containerRef"
        class="relative w-full h-full flex flex-col"
        data-tour="advisor-editor"
    >
        <div class="flex-1 overflow-y-auto">
            <div class="p-2">
                <ClientOnly>
                    <EditorContent
                        v-if="editor"
                        :editor="editor"
                        class="advisor-editor-content text-[17px] leading-relaxed text-toned"
                    />
                    <template #fallback>
                        <div
                            class="flex items-center justify-center py-20 text-muted"
                        >
                            <UIcon
                                name="i-lucide-loader-circle"
                                class="animate-spin text-2xl"
                            />
                        </div>
                    </template>
                </ClientOnly>
            </div>
        </div>

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
                <UIcon name="i-lucide-message-square-plus" class="text-sm" />
                {{ t("advisor.addNote") }}
            </button>
        </Teleport>
    </div>
</template>
