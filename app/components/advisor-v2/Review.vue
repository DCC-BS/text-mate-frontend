<script lang="ts" setup>
import { EditorContent } from "@tiptap/vue-3";
import type {
    AdvisorRange,
    AdvisorThread,
    AdvisorThreadStatus,
} from "~/types/advisorV2";
import {
    type AdvisorConnector,
    computeAdvisorLayout,
} from "~/utils/advisorLayout";

interface Props {
    threads: AdvisorThread[];
    focusedId: string | null;
    documentText: string;
    /** Review phase (vs. done) — toggles reply/edit + add-comment controls. */
    interactive: boolean;
    /** Shown as a banner once a revision has been applied. */
    done: boolean;
}

const props = defineProps<Props>();

/** Connector line colours (Theme A — quiet). */
const CONNECTOR_COLOR = "#bababa";
const CONNECTOR_FOCUS_COLOR = "#a56cc9";
const CONNECTOR_SKIP_COLOR = "#e3e3e3";

/** Add-comment popover geometry. */
const POPOVER_WIDTH = 300;
const POPOVER_HALF_WIDTH = POPOVER_WIDTH / 2;
/** Minimum left inset so the popover never clips the content edge. */
const POPOVER_MIN_LEFT = 8;

const emit = defineEmits<{
    focus: [id: string | null];
    setStatus: [id: string, status: AdvisorThreadStatus];
    deleteThread: [id: string];
    addReply: [id: string, text: string];
    updateNote: [id: string, noteId: string, text: string];
    deleteNote: [id: string, noteId: string];
    addComment: [range: AdvisorRange, text: string];
    openPdf: [thread: AdvisorThread];
}>();

const { t } = useI18n();

const text = computed(() => props.documentText);
const threadsRef = computed(() => props.threads);
const focusedRef = computed(() => props.focusedId);

const { editor, getSelection, clearSelection } = useAdvisorEditor({
    text,
    threads: threadsRef,
    focusedId: focusedRef,
    onMarkClick: (id) => emit("focus", id),
});

// Template refs for the connector geometry.
const workEl = ref<HTMLElement>();
const contentEl = ref<HTMLElement>();
const docEl = ref<HTMLElement>();
const cardsEl = ref<HTMLElement>();

const cardTops = ref<Record<string, number>>({});
const connectors = ref<AdvisorConnector[]>([]);
const svgWidth = ref(0);
const svgHeight = ref(0);
const contentMinHeight = ref<string>("");

const sortedThreads = computed(() =>
    [...props.threads].sort((a, b) => a.range.start - b.range.start),
);

/** Recomputes card positions and connector paths from the rendered DOM. */
function layout(): void {
    const content = contentEl.value;
    const cards = cardsEl.value;
    const doc = docEl.value;
    const editorDom = editor.value?.view.dom as HTMLElement | undefined;
    if (!content || !cards || !doc || !editorDom) {
        return;
    }

    const cardEls = Array.from(
        cards.querySelectorAll<HTMLElement>("[data-card-id]"),
    );
    if (cardEls.length === 0) {
        connectors.value = [];
        contentMinHeight.value = "";
        return;
    }

    const contentRect = content.getBoundingClientRect();

    // Anchor each thread to the top/middle of its first inline mark.
    const anchors: Record<string, { top: number; mid: number }> = {};
    for (const mark of editorDom.querySelectorAll<HTMLElement>(
        '[data-mark="1"]',
    )) {
        const id = mark.getAttribute("data-thread");
        if (!id || anchors[id]) {
            continue;
        }
        const rect = mark.getBoundingClientRect();
        anchors[id] = {
            top: rect.top - contentRect.top,
            mid: rect.top - contentRect.top + rect.height / 2,
        };
    }

    const items = cardEls.map((el) => {
        const id = el.getAttribute("data-card-id") ?? "";
        const anchor = anchors[id];
        const thread = props.threads.find((tt) => tt.id === id);
        return {
            id,
            height: el.offsetHeight,
            anchor: anchor?.top ?? 0,
            mid: anchor?.mid ?? 8,
            status: thread?.status ?? ("to-fix" as AdvisorThreadStatus),
        };
    });

    const x1 = doc.offsetLeft + doc.offsetWidth;
    const x2 = cards.offsetLeft;

    const result = computeAdvisorLayout(items, {
        x1,
        x2,
        focusedId: props.focusedId,
        connColor: CONNECTOR_COLOR,
        connFocusColor: CONNECTOR_FOCUS_COLOR,
        connSkipColor: CONNECTOR_SKIP_COLOR,
    });

    cardTops.value = result.tops;
    connectors.value = result.connectors;

    const width = content.clientWidth;
    const docBottom = doc.offsetTop + doc.offsetHeight;
    const height = Math.max(result.height, docBottom + 40);
    svgWidth.value = width;
    svgHeight.value = height;
    contentMinHeight.value = `${height}px`;
}

// All layout triggers (reactive changes, window resize, card resize) funnel
// through one rAF-coalesced scheduler so they collapse into a single measure
// per frame instead of running layout() multiple times.
let layoutScheduled = false;
function scheduleLayout(): void {
    if (layoutScheduled) {
        return;
    }
    layoutScheduled = true;
    nextTick(() =>
        requestAnimationFrame(() => {
            layoutScheduled = false;
            layout();
        }),
    );
}

let resizeObserver: ResizeObserver | undefined;

onMounted(() => {
    scheduleLayout();
    window.addEventListener("resize", scheduleLayout);
    if (cardsEl.value) {
        resizeObserver = new ResizeObserver(scheduleLayout);
        resizeObserver.observe(cardsEl.value);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener("resize", scheduleLayout);
    resizeObserver?.disconnect();
});

watch(
    () => [props.threads, props.focusedId, props.documentText],
    scheduleLayout,
    { deep: true },
);
watch(
    () => editor.value,
    (instance) => {
        if (instance) {
            scheduleLayout();
        }
    },
);

// --- Add comment bubble + popover ---------------------------------------
interface BubbleState {
    x: number;
    y: number;
    range: AdvisorRange;
}
interface PopoverState {
    x: number;
    y: number;
    mode: "new" | "reply";
    range?: AdvisorRange;
    threadId?: string;
    draft: string;
}

const bubble = ref<BubbleState | null>(null);
const popover = ref<PopoverState | null>(null);

function onProseMouseUp(): void {
    if (!props.interactive) {
        return;
    }
    const selection = getSelection();
    const content = contentEl.value;
    if (!selection || !content) {
        bubble.value = null;
        return;
    }
    const contentRect = content.getBoundingClientRect();
    bubble.value = {
        x: selection.rect.left - contentRect.left + selection.rect.width / 2,
        y: selection.rect.bottom - contentRect.top + 8,
        range: selection.range,
    };
}

function openComment(): void {
    const current = bubble.value;
    if (!current) {
        return;
    }
    const overlap = props.threads.find(
        (tt) =>
            current.range.start < tt.range.end &&
            current.range.end > tt.range.start,
    );
    clearSelection();

    if (overlap) {
        popover.value = {
            x: current.x,
            y: current.y,
            mode: "reply",
            threadId: overlap.id,
            draft: "",
        };
        emit("focus", overlap.id);
    } else {
        popover.value = {
            x: current.x,
            y: current.y,
            mode: "new",
            range: current.range,
            draft: "",
        };
    }
    bubble.value = null;
}

function submitPopover(): void {
    const current = popover.value;
    if (!current) {
        return;
    }
    const value = current.draft.trim();
    if (!value) {
        popover.value = null;
        return;
    }
    if (current.mode === "reply" && current.threadId) {
        emit("addReply", current.threadId, value);
    } else if (current.mode === "new" && current.range) {
        emit("addComment", current.range, value);
    }
    popover.value = null;
}

function cancelPopover(): void {
    popover.value = null;
}
</script>

<template>
    <div
        ref="workEl"
        class="relative flex-1 overflow-y-auto overflow-x-hidden"
        @mouseup="onProseMouseUp"
    >
        <div
            ref="contentEl"
            class="relative min-h-full pb-[90px] pt-[26px]"
            :style="{ minHeight: contentMinHeight || undefined }"
        >
            <!-- Prose column -->
            <div ref="docEl" class="ml-12 mr-[436px] max-w-[660px]">
                <div
                    class="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11.5px] font-semibold text-gray-500"
                >
                    <UIcon name="i-lucide-eye-off" class="size-3.5" />
                    {{ t("advisorV2.readOnlyBadge") }}
                </div>

                <div
                    v-if="done"
                    class="mb-[18px] flex items-start gap-2.5 rounded-[10px] border border-green-200 bg-green-50 px-3.5 py-3"
                >
                    <UIcon
                        name="i-lucide-check"
                        class="mt-px size-4 text-green-600"
                    />
                    <div>
                        <div class="text-[14px] font-bold text-green-800">
                            {{ t("advisorV2.doneTitle") }}
                        </div>
                        <div class="mt-0.5 text-[13px] text-gray-700">
                            {{ t("advisorV2.doneHint") }}
                        </div>
                    </div>
                </div>

                <EditorContent :editor="editor" class="advisor-prose" />
            </div>

            <!-- Connector layer -->
            <svg
                class="pointer-events-none absolute left-0 top-0 overflow-visible"
                :width="svgWidth"
                :height="svgHeight"
                :style="{ width: `${svgWidth}px`, height: `${svgHeight}px` }"
                aria-hidden="true"
            >
                <title>{{ t("advisorV2.connectorsTitle") }}</title>
                <template v-for="conn in connectors" :key="conn.id">
                    <path
                        :d="conn.d"
                        fill="none"
                        :stroke="conn.stroke"
                        :stroke-width="conn.width"
                        :opacity="conn.opacity"
                    />
                    <circle
                        :cx="conn.cx"
                        :cy="conn.cy"
                        r="2.6"
                        :fill="conn.stroke"
                    />
                </template>
            </svg>

            <!-- Cards rail -->
            <div ref="cardsEl" class="absolute right-7 top-0 w-[372px]">
                <AdvisorV2Card
                    v-for="thread in sortedThreads"
                    :key="thread.id"
                    :style="{ top: `${cardTops[thread.id] ?? 0}px` }"
                    :thread="thread"
                    :document-text="documentText"
                    :focused="thread.id === focusedId"
                    :interactive="interactive"
                    @focus="emit('focus', thread.id)"
                    @set-status="(status) => emit('setStatus', thread.id, status)"
                    @delete="emit('deleteThread', thread.id)"
                    @add-reply="(value) => emit('addReply', thread.id, value)"
                    @update-note="
                        (noteId, value) =>
                            emit('updateNote', thread.id, noteId, value)
                    "
                    @delete-note="(noteId) => emit('deleteNote', thread.id, noteId)"
                    @open-pdf="emit('openPdf', thread)"
                />

                <div
                    v-if="threads.length === 0"
                    class="flex flex-col items-center px-6 py-12 text-center text-gray-500"
                >
                    <UIcon
                        name="i-lucide-file-search"
                        class="mb-2.5 size-7 text-gray-300"
                    />
                    <div class="text-[14px]">{{ t("advisorV2.empty") }}</div>
                </div>
            </div>

            <!-- Add-comment bubble -->
            <div
                v-if="bubble"
                class="absolute z-40 -translate-x-1/2 rounded-lg border border-gray-200 bg-white shadow-md"
                :style="{ left: `${bubble.x}px`, top: `${bubble.y}px` }"
            >
                <button
                    type="button"
                    class="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-gray-800"
                    @click="openComment"
                >
                    <UIcon
                        name="i-lucide-message-square"
                        class="size-3.5 text-purple-600"
                    />
                    {{ t("advisorV2.addComment") }}
                </button>
            </div>

            <!-- Add-comment popover -->
            <div
                v-if="popover"
                class="absolute z-50 rounded-[10px] border border-gray-200 bg-white p-3.5 shadow-lg"
                :style="{
                    width: `${POPOVER_WIDTH}px`,
                    left: `${Math.max(POPOVER_MIN_LEFT, popover.x - POPOVER_HALF_WIDTH)}px`,
                    top: `${popover.y}px`,
                }"
            >
                <div class="mb-[7px] text-[12px] font-bold text-gray-700">
                    {{ popover.mode === "reply"
                            ? t("advisorV2.replyTitle")
                            : t("advisorV2.newCommentTitle") }}
                </div>
                <textarea
                    v-model="popover.draft"
                    rows="3"
                    :placeholder="t('advisorV2.commentPlaceholder')"
                    class="w-full resize-y rounded-md border border-gray-300 px-2.5 py-2 text-[13.5px] leading-[1.45] text-gray-900 outline-none"
                />
                <div class="mt-[9px] flex justify-end gap-2">
                    <button
                        type="button"
                        class="rounded-full border border-gray-300 px-3.5 py-1.5 text-[13px] text-gray-700"
                        @click="cancelPopover"
                    >
                        {{ t("advisorV2.cancel") }}
                    </button>
                    <button
                        type="button"
                        class="rounded-full bg-purple-600 px-4 py-1.5 text-[13px] font-medium text-white"
                        @click="submitPopover"
                    >
                        {{ popover.mode === "reply"
                                ? t("advisorV2.reply")
                                : t("advisorV2.add") }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
/* Inline highlight decorations rendered inside the read-only ProseMirror doc. */
.advisor-prose .ProseMirror {
    font-size: 19px;
    line-height: 2.05;
    color: var(--color-gray-900);
    outline: none;
}

.advisor-prose .ProseMirror p {
    margin: 0;
}

.advisor-mark {
    background: var(--color-purple-50);
    border-bottom: 1.5px solid var(--color-purple-300);
    border-radius: 2px;
    padding: 1px 0;
    cursor: pointer;
    transition:
        background 0.15s,
        border-color 0.15s;
}

.advisor-mark--focused {
    background: var(--color-purple-100);
    border-bottom-color: var(--color-purple-600);
    font-weight: 600;
}

.advisor-mark--skip {
    background: transparent;
    border-bottom: 1px dashed var(--color-gray-300);
    color: var(--color-gray-400);
    text-decoration: line-through;
}
</style>
