<script lang="ts" setup>
import type { AdvisorDiffHunk } from "~/composables/useAdvisorDiff";

interface Props {
    hunks: AdvisorDiffHunk[];
    changeCount: number;
    acceptedCount: number;
}

defineProps<Props>();

const emit = defineEmits<{
    setAccepted: [id: string, accepted: boolean];
    acceptAll: [];
    rejectAll: [];
}>();

const { t } = useI18n();
</script>

<template>
    <div class="h-full overflow-y-auto overflow-x-hidden">
        <div class="mx-auto max-w-[820px] px-9 pb-[90px] pt-7">
            <!-- Header -->
            <div
                class="mb-[18px] flex items-center justify-between gap-3 border-b border-gray-200 pb-3.5"
            >
                <div>
                    <div class="text-[18px] font-bold text-gray-900">
                        {{ t("advisorV2.diffTitle") }}
                    </div>
                    <div class="mt-0.5 text-[13px] text-gray-600">
                        {{ t("advisorV2.diffSummary", {
                                accepted: acceptedCount,
                                total: changeCount,
                            }) }}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button
                        type="button"
                        class="rounded-full border border-gray-300 bg-white px-3.5 py-[7px] text-[13px] text-gray-700 hover:bg-gray-50"
                        @click="emit('rejectAll')"
                    >
                        {{ t("advisorV2.rejectAll") }}
                    </button>
                    <button
                        type="button"
                        class="rounded-full border border-purple-600 bg-white px-3.5 py-[7px] text-[13px] font-medium text-purple-700 hover:bg-purple-50"
                        @click="emit('acceptAll')"
                    >
                        {{ t("advisorV2.acceptAll") }}
                    </button>
                </div>
            </div>

            <!-- Diff prose -->
            <p class="m-0 text-[19px] leading-[2.1] text-gray-900">
                <template v-for="hunk in hunks" :key="hunk.id">
                    <span v-if="hunk.kind === 'same'">{{ hunk.text }}</span>
                    <span v-else class="inline whitespace-nowrap">
                        <span
                            v-if="hunk.text"
                            :class="
                                hunk.accepted
                                    ? 'rounded-[2px] bg-red-50 px-0.5 text-gray-400 line-through'
                                    : 'border-b-2 border-dotted border-gray-300 text-gray-900'
                            "
                            >{{ hunk.text }}</span
                        >
                        <template v-if="hunk.accepted && hunk.add">
                            <span
                                v-if="hunk.text"
                                class="mx-[3px] text-gray-400"
                                >→</span
                            >
                            <span
                                class="rounded-[2px] bg-green-100 px-[3px] text-green-800"
                                >{{ hunk.add }}</span
                            >
                        </template>
                        <span class="ml-1.5 inline-flex gap-px align-middle">
                            <button
                                type="button"
                                :title="t('advisorV2.accept')"
                                class="flex size-[19px] items-center justify-center rounded-[5px]"
                                :class="
                                    hunk.accepted
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-500'
                                "
                                @click="emit('setAccepted', hunk.id, true)"
                            >
                                <UIcon name="i-lucide-check" class="size-3" />
                            </button>
                            <button
                                type="button"
                                :title="t('advisorV2.reject')"
                                class="flex size-[19px] items-center justify-center rounded-[5px]"
                                :class="
                                    !hunk.accepted
                                        ? 'bg-gray-400 text-white'
                                        : 'bg-gray-100 text-gray-500'
                                "
                                @click="emit('setAccepted', hunk.id, false)"
                            >
                                <UIcon name="i-lucide-x" class="size-3" />
                            </button>
                        </span>
                    </span>
                </template>
            </p>
        </div>
    </div>
</template>
