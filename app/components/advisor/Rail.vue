<script lang="ts" setup>
import type { AdvisorThread } from "~/assets/models/advisor";

interface InputProps {
    threads: AdvisorThread[];
    activeThreadId: string | null;
}

const props = defineProps<InputProps>();

const { t } = useI18n();

const emit = defineEmits<{
    apply: [];
    openPdf: [thread: AdvisorThread];
}>();

const toFixCount = computed(
    () => props.threads.filter((x) => x.status === "to-fix").length,
);
const skipCount = computed(() => props.threads.length - toFixCount.value);
</script>

<template>
    <div class="h-full flex flex-col">
        <header class="px-3 pt-3 pb-2 border-b border-default shrink-0">
            <h3
                class="flex items-center gap-1.5 text-sm font-semibold text-toned"
            >
                <UIcon name="i-lucide-sparkles" class="text-primary" />
                {{ t("advisor.title") }}
            </h3>
            <p class="flex gap-2 text-xs text-muted mt-2">
                <span>
                    <strong class="text-toned">{{ toFixCount }}</strong>
                    {{ t("advisor.toFix") }}
                </span>
                <span class="opacity-40">·</span>
                <span>{{ skipCount }} {{ t("advisor.skip") }}</span>
            </p>
        </header>

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
                    <p>{{ t("advisor.noThreadsYet") }}</p>
                </div>
            </div>
        </div>

        <footer class="px-3 py-2 border-t border-default shrink-0">
            <p class="text-[11px] text-muted text-center mb-1.5">
                {{ t("advisor.applyInfo", {
                        n: toFixCount,
                    }) }}
            </p>
            <UButton
                block
                color="primary"
                icon="i-lucide-download"
                :label="`${t('advisor.apply')} (${toFixCount})`"
                :disabled="toFixCount === 0"
                @click="emit('apply')"
            />
        </footer>
    </div>
</template>
