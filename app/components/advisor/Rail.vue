<script setup lang="ts">
import { UButton } from "#components";
import type { AdvisorThread } from "~/assets/models/advisor";

interface InputProps {
    threads: AdvisorThread[];
    activeThreadId: string | null;
    /** True while a Check stream is in progress. */
    checking?: boolean;
}

const props = withDefaults(defineProps<InputProps>(), { checking: false });

const { t } = useI18n();

const emit = defineEmits<{
    openPdf: [thread: AdvisorThread];
}>();

const toFixCount = computed(
    () => props.threads.filter((x) => x.status === "to-fix").length,
);
const skipCount = computed(() => props.threads.length - toFixCount.value);
</script>

<template>
    <div class="h-full flex flex-col">
        <div class="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            <template v-if="props.threads.length">
                <AdvisorThreadCard
                    v-for="thread in props.threads"
                    :key="thread.id"
                    :thread="thread"
                    :active-thread-id="props.activeThreadId"
                    @open-pdf="emit('openPdf', $event)"
                />
            </template>
            <div
                v-else
                class="h-full grid place-items-center text-center text-sm text-muted p-4"
            >
                <div>
                    <UIcon
                        name="i-lucide-file-search"
                        class="text-3xl mb-2 opacity-50"
                    />
                    <p v-if="checking">{{ t("advisor.noThreadsReviewing") }}</p>
                    <p v-else>{{ t("advisor.noThreadsReview") }}</p>
                </div>
            </div>
        </div>
    </div>
</template>
