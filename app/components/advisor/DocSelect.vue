<script lang="ts" setup>
import type { AdvisorDocumentDescription } from "#shared/types/advisor";

const { t } = useI18n();
const { docs } = useAdvisor();

const selectedIds = defineModel<string[]>({ default: () => [] });
/** Tracks which doc cards are expanded to reveal details. */
const expandedIds = ref<string[]>([]);

/** Toggle a document's selection state by id. */
function toggleDoc(id: string, checked: string | boolean): void {
    const isChecked = typeof checked === "boolean" ? checked : Boolean(checked);
    if (isChecked) {
        if (!selectedIds.value.includes(id)) {
            selectedIds.value.push(id);
        }
    } else {
        selectedIds.value = selectedIds.value.filter(
            (existing) => existing !== id,
        );
    }
}

/** Toggle a document card's expanded state by id. */
function toggleExpand(id: string): void {
    expandedIds.value = expandedIds.value.includes(id)
        ? expandedIds.value.filter((existing) => existing !== id)
        : [...expandedIds.value, id];
}

// const selectedDocs = defineModel<AdvisorDocumentDescription[]>({
//     default: [],
//     get: () =>
//         docs.value.filter((doc) =>
//             selectedIds.value.includes(doc.id),
//         ) as AdvisorDocumentDescription[],
//     set: (value: AdvisorDocumentDescription[]) => {
//         selectedIds.value = value.map((doc) => doc.id);
//     },
// });
</script>

<template>
    <div class="w-full">
        <!-- Expandable checkbox cards: click card to toggle selection,
             click chevron to reveal document details inline -->
        <div class="doc-select-list flex w-full flex-col">
            <div v-for="doc in docs" :key="doc.id" class="relative w-full">
                <UCheckbox
                    :model-value="selectedIds.includes(doc.id)"
                    variant="card"
                    :label="doc.title"
                    class="w-full pe-10"
                    @update:model-value="toggleDoc(doc.id, $event as boolean)"
                >
                    <template #description>
                        <span v-if="!expandedIds.includes(doc.id)">
                            {{ doc.author }}
                            · {{ doc.description }}
                        </span>
                        <span v-else class="block space-y-1.5 pt-1">
                            <span class="flex items-center gap-1.5 text-muted">
                                <UIcon
                                    name="i-lucide-badge-info"
                                    class="size-3.5 shrink-0"
                                />
                                <span>{{ doc.description }}</span>
                            </span>
                            <span class="flex items-center gap-1.5 text-muted">
                                <UIcon
                                    name="i-lucide-book-open"
                                    class="size-3.5 shrink-0"
                                />
                                <span>{{ doc.edition }}</span>
                            </span>
                            <span class="flex items-center gap-1.5 text-muted">
                                <UIcon
                                    name="i-lucide-user"
                                    class="size-3.5 shrink-0"
                                />
                                <span>{{ doc.author }}</span>
                            </span>
                            <span class="flex items-center gap-1.5 text-muted">
                                <UIcon
                                    name="i-lucide-files"
                                    class="size-3.5 shrink-0"
                                />
                                <span>
                                    {{ doc.files.length }}
                                    {{ doc.files.length === 1
                                            ? "file"
                                            : "files" }}
                                </span>
                            </span>
                        </span>
                    </template>
                </UCheckbox>
                <!-- Sibling of UCheckbox (outside the label) so tapping it
                     expands details without toggling the checkbox -->
                <UButton
                    :icon="
                        expandedIds.includes(doc.id)
                            ? 'i-lucide-chevron-up'
                            : 'i-lucide-chevron-down'
                    "
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    class="absolute end-2.5 top-2.5"
                    :aria-expanded="expandedIds.includes(doc.id)"
                    :aria-label="t('advisor.toggleDetails')"
                    @click="toggleExpand(doc.id)"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.doc-select-list > :not(:first-child) {
    margin-top: -1px;
}
.doc-select-list :deep([data-slot="root"]) {
    border-radius: 0;
    border-color: var(--ui-border-muted);
}
.doc-select-list > :first-child :deep([data-slot="root"]) {
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
}
.doc-select-list > :last-child :deep([data-slot="root"]) {
    border-bottom-left-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
}
</style>
