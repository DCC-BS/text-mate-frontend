<script lang="ts" setup>
import { tree } from "#build/ui";
import type { AdvisorThread } from "~/assets/models/advisor";
import {
    AddThreadNoteCommand,
    ChangeActiveThreadId,
    ChangeThreadNoteCommand,
    DeleteThreadNoteCommand,
    SetThreadStatusCommand,
} from "~/assets/models/commands";

interface ThreadCardProps {
    thread: AdvisorThread;
    activeThreadId: string | null;
}

const props = defineProps<ThreadCardProps>();
const emit = defineEmits<{
    openPdf: [thread: AdvisorThread];
}>();
const { t } = useI18n();
const { executeCommand } = useCommandBus();

const isActive = computed(() => props.activeThreadId === props.thread.id);
const isSkip = computed(() => props.thread.status === "skip");
const isUser = computed(() => props.thread.type === "user");

const cardRef = ref<HTMLElement | null>(null);

// Local reply + note-edit state. Kept local rather than in the store since
// it is transient UI state tied to this card instance.
const replyOpen = ref(false);
const replyText = ref("");
const editingNoteId = ref<string | null>(null);
const editingText = ref("");

onMounted(async () => {
    if (!props.thread.violation && props.thread.notes.length === 0) {
        await executeCommand(new AddThreadNoteCommand(props.thread.id, ""));

        const newNote = props.thread.notes[0];
        if (newNote) {
            editingNoteId.value = newNote.id;
            nextTick(() => {
                document
                    .getElementById(`advisor-note-edit-${newNote.id}`)
                    ?.focus();
            });
        }
    }
});

function activate(): void {
    executeCommand(new ChangeActiveThreadId(props.thread.id));
}

function scrollCardIntoView(): void {
    nextTick(() => {
        cardRef.value?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
}

// When the store marks this thread active from elsewhere (editor mark
// click), scroll the card into view.
watch(
    () => props.activeThreadId,
    (id) => {
        if (id === props.thread.id) {
            scrollCardIntoView();
        }
    },
);

onMounted(() => {
    if (isActive.value) {
        scrollCardIntoView();
    }
});

async function setStatus(status: AdvisorThread["status"]) {
    await executeCommand(new SetThreadStatusCommand(props.thread.id, status));
}

function openReply(): void {
    replyOpen.value = true;
    nextTick(() => {
        document.getElementById(`advisor-reply-${props.thread.id}`)?.focus();
    });
}

async function submitReply() {
    if (replyText.value.trim() === "") {
        return;
    }

    await executeCommand(
        new AddThreadNoteCommand(props.thread.id, replyText.value),
    );
    replyText.value = "";
    replyOpen.value = false;
}

function startEdit(noteId: string, text: string): void {
    editingNoteId.value = noteId;
    editingText.value = text;
}

async function saveEdit() {
    if (editingNoteId.value) {
        await executeCommand(
            new ChangeThreadNoteCommand(
                props.thread.id,
                editingNoteId.value,
                editingText.value,
            ),
        );
    }
    editingNoteId.value = null;
    editingText.value = "";
}

async function deleteNote(noteId: string) {
    await executeCommand(new DeleteThreadNoteCommand(props.thread.id, noteId));
}

function openPdf(): void {
    emit("openPdf", props.thread);
}
</script>

<template>
    <article
        ref="cardRef"
        class="rounded-lg border p-3 transition-colors"
        :class="[
            isActive ? 'border-primary shadow-sm' : 'border-default',
            isSkip ? 'opacity-50' : '',
            isUser ? 'bg-secondary/5' : 'bg-default',
        ]"
        @click="activate"
    >
        <header class="flex items-center justify-between mb-2">
            <span
                class="flex items-center gap-1.5 text-xs font-semibold text-toned"
            >
                <UIcon
                    :name="isUser ? 'i-lucide-message-square' : 'i-lucide-zap'"
                    class="text-sm"
                    :class="
                        isUser
                            ? 'text-secondary'
                            : isSkip
                              ? 'text-muted'
                              : 'text-primary'
                    "
                />
            </span>
            <button
                v-if="thread.violation"
                type="button"
                class="flex items-center gap-1 text-[11px] text-muted hover:text-primary transition-colors font-mono"
                :title="`${thread.violation.file_name} · p.${thread.violation.page_number}`"
                @click.stop="openPdf"
            >
                <UIcon name="i-lucide-file-search" class="text-xs" />
                {{ thread.violation.file_name }}
                · p.{{ thread.violation.page_number }}
            </button>
        </header>

        <p
            v-if="thread.violation"
            class="text-[13px] leading-relaxed text-toned mb-2"
        >
            {{ thread.violation.reason }}
        </p>

        <div
            v-if="!isUser && thread.violation?.proposal"
            class="bg-secondary/10 rounded-md p-2 mb-2 text-xs"
        >
            <p class="text-[11px] text-secondary font-semibold mb-0.5">
                {{ t("advisor.suggestion") }}
            </p>
            <p class="text-toned">{{ thread.violation.proposal }}</p>
        </div>

        <ul v-if="thread.notes.length" class="space-y-1 mt-2">
            <li
                v-for="note in thread.notes"
                :key="note.id"
                class="text-xs bg-muted/40 rounded-md p-2"
            >
                <div
                    class="flex items-center gap-1.5 font-semibold text-toned mb-0.5"
                >
                    <span
                        class="w-[18px] h-[18px] grid place-items-center rounded-full text-[10px] text-inverted"
                        :class="
                            note.author === 'advisor'
                                ? 'bg-secondary'
                                : 'bg-primary'
                        "
                    >
                        {{ note.author === "advisor" ? "A" : "Y" }}
                    </span>
                    {{ note.author === "advisor"
                            ? t("advisor.advisor")
                            : t("advisor.you") }}
                    <span class="ml-auto flex gap-0.5 transition-opacity">
                        <UButton
                            icon="i-lucide-pencil"
                            size="xs"
                            variant="ghost"
                            color="neutral"
                            :title="t('common.edit')"
                            @click.stop="startEdit(note.id, note.text)"
                        />
                        <UButton
                            icon="i-lucide-trash-2"
                            size="xs"
                            variant="ghost"
                            color="neutral"
                            :title="t('common.delete')"
                            @click.stop="deleteNote(note.id)"
                        />
                    </span>
                </div>
                <div v-if="editingNoteId === note.id" class="flex gap-1 mt-1">
                    <UInput
                        :id="`advisor-note-edit-${note.id}`"
                        v-model="editingText"
                        size="xs"
                        class="flex-1"
                        @keydown.enter="saveEdit"
                        @keydown.esc="editingNoteId = null"
                        @click.stop
                    />
                    <UButton
                        icon="i-lucide-check"
                        size="xs"
                        color="primary"
                        @click.stop="saveEdit"
                    />
                </div>
                <p v-else>{{ note.text }}</p>
            </li>
        </ul>

        <div v-if="replyOpen" class="flex gap-1 mt-1">
            <UInput
                :id="`advisor-reply-${thread.id}`"
                v-model="replyText"
                size="xs"
                :placeholder="t('advisor.replyPlaceholder')"
                class="flex-1"
                @keydown.enter="submitReply"
                @keydown.esc="replyOpen = false"
                @click.stop
            />
            <UButton
                icon="i-lucide-send"
                size="xs"
                color="primary"
                @click.stop="submitReply"
            />
        </div>

        <footer
            class="flex items-center justify-between mt-2 pt-2 border-t border-default"
        >
            <div
                v-if="!isUser"
                class="flex border border-default rounded-md p-0.5 gap-0.5 bg-muted/40"
            >
                <button
                    type="button"
                    class="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors"
                    :class="
                        thread.status === 'to-fix'
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted'
                    "
                    @click.stop="setStatus('to-fix')"
                >
                    <UIcon name="i-lucide-wrench" class="text-xs" />
                    {{ t("advisor.toFix") }}
                </button>
                <button
                    type="button"
                    class="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors"
                    :class="
                        thread.status === 'skip'
                            ? 'bg-muted text-toned'
                            : 'text-muted'
                    "
                    @click.stop="setStatus('skip')"
                >
                    <UIcon name="i-lucide-circle-slash" class="text-xs" />
                    {{ t("advisor.skip") }}
                </button>
            </div>
            <UButton
                icon="i-lucide-reply"
                size="xs"
                variant="ghost"
                color="neutral"
                :label="t('advisor.reply')"
                @click.stop="openReply"
            />
        </footer>
    </article>
</template>
