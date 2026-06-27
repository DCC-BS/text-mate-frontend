<script lang="ts" setup>
import type { AdvisorDocumentDescription } from "~~/shared/types/advisor";
import { useAdvisorStore } from "~/stores/advisor";

interface DocSelectGridProps {
    docs: AdvisorDocumentDescription[];
    max?: number;
}

const props = withDefaults(defineProps<DocSelectGridProps>(), {
    max: 5,
});

const { t } = useI18n();
const store = useAdvisorStore();

const selected = computed({
    get: () => store.selectedDocIds,
    set: (ids: string[]) => store.selectDocs(ids),
});

const selectedCount = computed(() => selected.value.length);
const atLimit = computed(() => selectedCount.value >= props.max);

function isSelected(id: string): boolean {
    return selected.value.includes(id);
}

function toggle(id: string): void {
    if (isSelected(id)) {
        selected.value = selected.value.filter((x) => x !== id);
        return;
    }
    if (atLimit.value) {
        return;
    }
    selected.value = [...selected.value, id];
}
</script>

<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
            v-for="doc in props.docs"
            :key="doc.id"
            type="button"
            class="text-left flex items-start gap-2.5 p-3 rounded-md border transition-colors"
            :class="
                isSelected(doc.id)
                    ? 'border-primary bg-primary/5'
                    : atLimit
                      ? 'border-default opacity-45 cursor-not-allowed'
                      : 'border-default bg-default hover:border-muted'
            "
            :aria-pressed="isSelected(doc.id)"
            :disabled="atLimit && !isSelected(doc.id)"
            @click="toggle(doc.id)"
        >
            <span
                class="w-8 h-8 shrink-0 grid place-items-center rounded-md border"
                :class="
                    isSelected(doc.id)
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-default bg-muted/40 text-muted'
                "
            >
                <UIcon name="i-lucide-book-open" class="text-base" />
            </span>
            <span class="flex-1 min-w-0">
                <span class="block text-sm font-semibold text-toned">
                    {{ doc.title }}
                </span>
                <span class="block text-xs text-muted truncate">
                    {{ doc.description }}
                </span>
                <span
                    class="block mt-1 text-[11px] text-muted font-mono truncate"
                >
                    {{ doc.author }}
                    · {{ doc.edition }} ·
                    {{ doc.files.length }}
                    files
                </span>
            </span>
            <span
                class="w-[18px] h-[18px] mt-px shrink-0 grid place-items-center rounded border transition-colors"
                :class="
                    isSelected(doc.id)
                        ? 'bg-primary border-primary text-inverted'
                        : 'border-default'
                "
            >
                <UIcon
                    v-if="isSelected(doc.id)"
                    name="i-lucide-check"
                    class="text-[12px]"
                />
            </span>
        </button>
        <p class="col-span-full text-xs text-muted mt-1">
            {{
                t("advisor.docCount", {
                    n: selectedCount,
                    max: props.max,
                })
            }}
        </p>
    </div>
</template>
