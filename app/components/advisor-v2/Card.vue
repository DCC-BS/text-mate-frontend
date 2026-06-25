<script lang="ts" setup>
import type { AdvisorThread, AdvisorThreadStatus } from "~/types/advisorV2";

interface Props {
    thread: AdvisorThread;
    documentText: string;
    focused: boolean;
    /** When true, reply/edit controls are shown (review phase only). */
    interactive: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    focus: [];
    setStatus: [status: AdvisorThreadStatus];
    delete: [];
    openPdf: [];
    addReply: [text: string];
    updateNote: [noteId: string, text: string];
    deleteNote: [noteId: string];
}>();

const { t } = useI18n();

const isUser = computed(() => props.thread.type === "user");
const isFix = computed(() => props.thread.status === "to-fix");
const snippet = computed(() =>
    props.documentText.slice(props.thread.range.start, props.thread.range.end),
);
/** The comment body for user threads (first note) vs. all violation notes. */
const commentNote = computed(() =>
    isUser.value ? props.thread.notes[0] : undefined,
);
const replyNotes = computed(() =>
    isUser.value ? props.thread.notes.slice(1) : props.thread.notes,
);

const replyDraft = ref("");
const editingNoteId = ref<string | null>(null);
const editDraft = ref("");

function startEdit(noteId: string, text: string): void {
    editingNoteId.value = noteId;
    editDraft.value = text;
}

function saveEdit(): void {
    if (editingNoteId.value) {
        emit("updateNote", editingNoteId.value, editDraft.value.trim());
    }
    editingNoteId.value = null;
}

function cancelEdit(): void {
    editingNoteId.value = null;
}

function submitReply(): void {
    const value = replyDraft.value.trim();
    if (!value) {
        return;
    }
    emit("addReply", value);
    replyDraft.value = "";
}

function onReplyKey(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitReply();
    }
}
</script>

<template>
    <div
        :data-card-id="thread.id"
        class="advisor-card absolute left-0 w-full box-border rounded-[10px] p-[13px_15px] border transition-[top,box-shadow] duration-200"
        :class="
            thread.status === 'skip'
                ? 'bg-gray-100 border-gray-200 grayscale'
                : focused
                  ? 'bg-white border-purple-300 shadow-md'
                  : 'bg-white border-gray-200 shadow-sm'
        "
        @mousedown="emit('focus')"
    >
        <!-- User comment header -->
        <div v-if="isUser" class="flex items-center gap-[9px]">
            <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600"
            >
                <UIcon name="i-lucide-user" class="size-4" />
            </span>
            <div class="min-w-0 flex-1">
                <div class="text-[13px] font-bold text-gray-900">
                    {{ t("advisorV2.you") }}
                </div>
                <div class="text-[11px] text-gray-500">
                    {{ t("advisorV2.justNow") }}
                </div>
            </div>
            <div class="flex gap-0.5">
                <button
                    v-if="commentNote && interactive"
                    type="button"
                    :title="t('advisorV2.edit')"
                    class="flex size-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                    @click.stop="startEdit(commentNote.id, commentNote.text)"
                >
                    <UIcon name="i-lucide-pencil" class="size-3.5" />
                </button>
                <button
                    type="button"
                    :title="t('advisorV2.delete')"
                    class="flex size-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                    @click.stop="emit('delete')"
                >
                    <UIcon name="i-lucide-x" class="size-3.5" />
                </button>
            </div>
        </div>

        <!-- Violation rule name -->
        <div
            v-if="!isUser"
            class="mt-0.5 text-[14.5px] font-bold leading-[1.35] text-gray-900"
        >
            {{ thread.rule_name }}
        </div>

        <!-- Quoted snippet -->
        <div
            class="mt-2 rounded-[5px] border-l-2 border-purple-300 bg-gray-50 px-[10px] py-1.5 text-[12.5px] italic leading-[1.4] text-gray-600"
        >
            «{{ snippet }}»
        </div>

        <!-- Violation body -->
        <template v-if="!isUser">
            <div class="mt-2.5 text-[13.5px] leading-[1.5] text-gray-800">
                {{ thread.reason }}
            </div>
            <div
                v-if="thread.proposal"
                class="mt-[9px] rounded-lg border border-teal-600/25 bg-teal-100/45 px-[11px] py-[9px]"
            >
                <div
                    class="mb-[3px] text-[10px] font-bold uppercase tracking-wide text-teal-800"
                >
                    {{ t("advisorV2.proposal") }}
                </div>
                <div class="text-[13.5px] leading-[1.5] text-gray-800">
                    {{ thread.proposal }}
                </div>
            </div>
            <button
                v-if="thread.file_name"
                type="button"
                class="mt-[9px] flex items-center gap-1.5 text-[11.5px] text-gray-600 hover:text-gray-800"
                @click.stop="emit('openPdf')"
            >
                <UIcon name="i-lucide-file-search" class="size-3.5 shrink-0" />
                <span class="underline">{{ thread.file_name }}</span>
                <template v-if="thread.page_number">
                    <span class="text-gray-400">·</span>
                    <span
                        >{{ t("advisorV2.page") }}
                        {{ thread.page_number }}</span
                    >
                </template>
            </button>
        </template>

        <!-- User comment body / edit -->
        <template v-else-if="commentNote">
            <div v-if="editingNoteId === commentNote.id" class="mt-[9px]">
                <textarea
                    v-model="editDraft"
                    rows="2"
                    class="w-full resize-y rounded-md border border-purple-400 px-[9px] py-[7px] text-[13.5px] leading-[1.45] text-gray-900 outline-none"
                />
                <div class="mt-1.5 flex justify-end gap-1.5">
                    <button
                        type="button"
                        class="rounded-full border border-gray-300 px-3 py-1 text-[12.5px] text-gray-700"
                        @click.stop="cancelEdit"
                    >
                        {{ t("advisorV2.cancel") }}
                    </button>
                    <button
                        type="button"
                        class="rounded-full bg-purple-600 px-[13px] py-1 text-[12.5px] font-medium text-white"
                        @click.stop="saveEdit"
                    >
                        {{ t("advisorV2.save") }}
                    </button>
                </div>
            </div>
            <div
                v-else
                class="mt-[9px] whitespace-pre-wrap text-[13.5px] leading-[1.5] text-gray-800"
            >
                {{ commentNote.text }}
            </div>
        </template>

        <!-- Replies -->
        <div
            v-if="replyNotes.length"
            class="mt-[11px] flex flex-col gap-[9px] border-t border-gray-100 pt-2.5"
        >
            <div
                v-for="note in replyNotes"
                :key="note.id"
                class="flex gap-[7px]"
            >
                <span
                    class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600"
                >
                    <UIcon name="i-lucide-user" class="size-3" />
                </span>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-1.5">
                        <div class="text-[11.5px] font-bold text-gray-800">
                            {{ t("advisorV2.you") }}
                        </div>
                        <div v-if="interactive" class="flex gap-px">
                            <button
                                type="button"
                                :title="t('advisorV2.edit')"
                                class="flex size-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                                @click.stop="startEdit(note.id, note.text)"
                            >
                                <UIcon name="i-lucide-pencil" class="size-3" />
                            </button>
                            <button
                                type="button"
                                :title="t('advisorV2.delete')"
                                class="flex size-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                                @click.stop="emit('deleteNote', note.id)"
                            >
                                <UIcon name="i-lucide-x" class="size-3" />
                            </button>
                        </div>
                    </div>
                    <div v-if="editingNoteId === note.id" class="mt-0.5">
                        <textarea
                            v-model="editDraft"
                            rows="2"
                            class="w-full resize-y rounded-md border border-purple-400 px-2 py-1.5 text-[13px] leading-[1.4] text-gray-900 outline-none"
                        />
                        <div class="mt-1 flex justify-end gap-1.5">
                            <button
                                type="button"
                                class="rounded-full border border-gray-300 px-2.5 py-0.5 text-[12px] text-gray-700"
                                @click.stop="cancelEdit"
                            >
                                {{ t("advisorV2.cancel") }}
                            </button>
                            <button
                                type="button"
                                class="rounded-full bg-purple-600 px-3 py-0.5 text-[12px] font-medium text-white"
                                @click.stop="saveEdit"
                            >
                                {{ t("advisorV2.save") }}
                            </button>
                        </div>
                    </div>
                    <div
                        v-else
                        class="whitespace-pre-wrap text-[13px] leading-[1.45] text-gray-700"
                    >
                        {{ note.text }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Reply input -->
        <div v-if="interactive" class="mt-2.5 flex items-end gap-1.5">
            <textarea
                v-model="replyDraft"
                rows="1"
                :placeholder="t('advisorV2.replyPlaceholder')"
                class="min-h-[34px] flex-1 resize-none rounded-md border border-gray-300 px-[9px] py-[7px] text-[13px] leading-[1.4] text-gray-900 outline-none"
                @keydown="onReplyKey"
            />
            <button
                type="button"
                :title="t('advisorV2.send')"
                class="flex size-[34px] shrink-0 items-center justify-center rounded-md bg-purple-600 text-white"
                @click.stop="submitReply"
            >
                <UIcon name="i-lucide-send" class="size-3.5" />
            </button>
        </div>

        <!-- Status toggle -->
        <div class="mt-3 flex">
            <div
                class="inline-flex overflow-hidden rounded-[7px] border border-gray-200"
            >
                <button
                    type="button"
                    class="flex items-center px-2.5 py-[5px] text-[12px] font-semibold transition-colors"
                    :class="
                        isFix
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-white text-gray-500'
                    "
                    @click.stop="emit('setStatus', 'to-fix')"
                >
                    <UIcon name="i-lucide-check" class="size-3.5" />
                    <span class="ml-1.5">{{ t("advisorV2.fix") }}</span>
                </button>
                <button
                    type="button"
                    class="flex items-center border-l border-gray-200 px-2.5 py-[5px] text-[12px] font-semibold transition-colors"
                    :class="
                        !isFix
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-white text-gray-500'
                    "
                    @click.stop="emit('setStatus', 'skip')"
                >
                    <UIcon name="i-lucide-eye-off" class="size-3.5" />
                    <span class="ml-1.5">{{ t("advisorV2.ignore") }}</span>
                </button>
            </div>
        </div>
    </div>
</template>
