<script lang="ts" setup>
import type { AdvisorDocumentFile } from "~~/shared/types/advisor";
import PdfViewerClient from "~/components/advisor/PdfViewer.client.vue";

const { t } = useI18n();
const { docs, getDocFile } = useAdvisor();

const overlay = useOverlay();
const logger = useLogger();
const toast = useToast();

// Fullscreen PDF preview; the same overlay the violation threads use.
const pdfModal = overlay.create(PdfViewerClient);

/** File currently being fetched for preview; guards parallel opens. */
const openingFileName = ref<string>();

interface DocSelectProps {
    /** Maximum number of selectable documents. */
    max?: number;
}
const props = withDefaults(defineProps<DocSelectProps>(), { max: 5 });

const selectedIds = defineModel<string[]>({ default: () => [] });
/** Tracks which doc cards are expanded to reveal details. */
const expandedIds = ref<string[]>([]);

/** Number of currently selected documents. */
const selectedCount = computed(() => selectedIds.value.length);
/** True once the selection limit has been reached. */
const limitReached = computed(() => selectedCount.value >= props.max);
/** Whether every available document is selected. */
const allSelected = computed(
    () =>
        docs.value.length > 0 &&
        docs.value.every((d) => selectedIds.value.includes(d.id)),
);

/** Toggle a document's selection state by id. */
function toggleDoc(id: string, checked: boolean): void {
    if (checked) {
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

/** Select every document up to the configured limit. */
function selectAll(): void {
    selectedIds.value = docs.value.slice(0, props.max).map((d) => d.id);
}

/** Clear the current selection. */
function clearSelection(): void {
    selectedIds.value = [];
}

/**
 * Cleans a raw PDF filename for display: strips the extension and spaces
 * out underscore/hyphen separators. Only used as fallback when the backend
 * sends no file title.
 */
function displayFileName(file: string): string {
    return file
        .replace(/\.[a-z]+$/i, "")
        .replaceAll("_", " ")
        .replaceAll("-", " ");
}

/** Display label for a file: backend title when present, cleaned filename otherwise. */
function fileLabel(file: AdvisorDocumentFile): string {
    return file.title.trim() || displayFileName(file.name);
}

/**
 * Opens a reference document in the fullscreen PDF preview. Fetches the
 * file blob through the advisor API and shows it on page 1; the user can
 * inspect bundled guidelines without running a check first.
 */
async function openFile(file: AdvisorDocumentFile): Promise<void> {
    if (openingFileName.value !== undefined) {
        return;
    }
    openingFileName.value = file.name;
    try {
        const blob = await getDocFile(file.name);
        pdfModal.open({
            file: blob,
            page: 1,
            fileName: file.name,
            onClose: () => pdfModal.close(),
        });
    } catch (error: unknown) {
        logger.error(
            { error: String(error) },
            "Failed to open reference document.",
        );
        toast.add({
            title: t("advisor.docOpenFailed"),
            color: "error",
            icon: "i-lucide-file-x",
        });
    } finally {
        openingFileName.value = undefined;
    }
}

/** Static UI override: keeps the card border width constant so selection
 *  never shifts the layout — only the colour (via `color="primary"`) and a
 *  subtle tint react to the checked state. */
const checkboxUi = {
    root: "transition-colors duration-150 hover:border-accented has-data-[state=checked]:bg-primary/5",
} as const;
</script>

<template>
    <div class="w-full">
        <!-- Header: selection counter + bulk actions -->
        <div class="flex items-center justify-between gap-3 mb-3 px-1">
            <div class="flex items-center gap-2">
                <UIcon
                    name="i-lucide-library"
                    class="size-4 text-primary shrink-0"
                />
                <span class="text-sm font-medium text-toned">
                    {{ t("advisor.selectDocsTitle") }}
                </span>
                <UBadge
                    :color="limitReached ? 'warning' : 'primary'"
                    variant="subtle"
                    size="sm"
                    class="tabular-nums"
                >
                    {{ selectedCount }}
                    / {{ max }}
                </UBadge>
            </div>
            <div class="flex items-center gap-1">
                <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    :label="t('advisor.clear')"
                    :disabled="selectedCount === 0"
                    icon="i-lucide-eraser"
                    @click="clearSelection"
                />
            </div>
        </div>

        <!-- Expandable checkbox cards: click card to toggle selection,
             click chevron to reveal document details inline -->
        <div
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 w-full max-h-[80vh] overflow-auto"
        >
            <div v-for="doc in docs" :key="doc.id" class="relative">
                <UCheckbox
                    :model-value="selectedIds.includes(doc.id)"
                    variant="card"
                    color="primary"
                    :ui="checkboxUi"
                    :disabled="limitReached && !selectedIds.includes(doc.id)"
                    class="w-full h-full pe-9"
                    @update:model-value="toggleDoc(doc.id, $event as boolean)"
                >
                    <template #label>
                        <span class="flex items-center gap-2 w-full">
                            <span
                                class="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary shrink-0 transition-colors"
                                :class="{
                                    'bg-primary text-inverted':
                                        selectedIds.includes(doc.id),
                                }"
                            >
                                <UIcon
                                    name="i-lucide-book-marked"
                                    class="size-4"
                                />
                            </span>
                            <span
                                class="font-medium text-default text-sm leading-tight truncate"
                            >
                                {{ doc.title }}
                            </span>
                            <!-- Number of bundled rules this collection contributes. -->
                            <UBadge
                                v-if="doc.rule_count > 0"
                                color="neutral"
                                variant="subtle"
                                size="sm"
                                class="shrink-0 tabular-nums"
                            >
                                {{ t("advisor.rules", doc.rule_count) }}
                            </UBadge>
                        </span>
                    </template>
                    <template #description>
                        <span
                            v-if="!expandedIds.includes(doc.id)"
                            class="block text-xs text-muted line-clamp-2 pt-0.5 ps-10"
                        >
                            {{ doc.author }}
                            · {{ doc.description }}
                        </span>
                        <span
                            v-else
                            class="block ps-10 pt-2 mt-1 border-t border-muted/60 space-y-2 text-xs"
                        >
                            <span class="flex items-start gap-2 text-muted">
                                <UIcon
                                    name="i-lucide-badge-info"
                                    class="size-3.5 shrink-0 mt-0.5 text-toned"
                                />
                                <span>{{ doc.description }}</span>
                            </span>
                            <span class="flex items-center gap-2 text-muted">
                                <UIcon
                                    name="i-lucide-book-open"
                                    class="size-3.5 shrink-0 text-toned"
                                />
                                <span>{{ doc.edition }}</span>
                            </span>
                            <span class="flex items-center gap-2 text-muted">
                                <UIcon
                                    name="i-lucide-user-round"
                                    class="size-3.5 shrink-0 text-toned"
                                />
                                <span>{{ doc.author }}</span>
                            </span>
                            <span class="flex items-center gap-2 text-muted">
                                <UIcon
                                    name="i-lucide-files"
                                    class="size-3.5 shrink-0 text-toned"
                                />
                                <span>
                                    {{ doc.files.length }}
                                    {{
                                        doc.files.length === 1
                                            ? t("advisor.file")
                                            : t("advisor.files")
                                    }}
                                </span>
                            </span>
                            <!-- Per-group selection: selecting the document
                                 checks every file in it, so each file shows a
                                 check mark while the document is selected. -->
                            <span
                                v-for="file in doc.files"
                                :key="file.name"
                                class="block space-y-1"
                            >
                                <span
                                    class="flex items-center gap-2"
                                    :class="
                                        selectedIds.includes(doc.id)
                                            ? 'text-default'
                                            : 'text-muted'
                                    "
                                >
                                    <UIcon
                                        :name="
                                            selectedIds.includes(doc.id)
                                                ? 'i-lucide-circle-check-big'
                                                : 'i-lucide-file'
                                        "
                                        class="size-3.5 shrink-0"
                                        :class="
                                            selectedIds.includes(doc.id)
                                                ? 'text-success'
                                                : 'text-muted/60'
                                        "
                                    />
                                    <button
                                        type="button"
                                        class="flex min-w-0 items-center gap-1 underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-50"
                                        :class="
                                            selectedIds.includes(doc.id)
                                                ? 'text-default'
                                                : 'text-muted'
                                        "
                                        :aria-label="
                                            t('advisor.openDoc', {
                                                name: fileLabel(file),
                                            })
                                        "
                                        :title="
                                            t('advisor.openDoc', {
                                                name: fileLabel(file),
                                            })
                                        "
                                        :disabled="
                                            openingFileName !== undefined
                                        "
                                        @click.stop.prevent="openFile(file)"
                                    >
                                        <span class="truncate">
                                            {{ fileLabel(file) }}
                                        </span>
                                        <UIcon
                                            :name="
                                                openingFileName === file.name
                                                    ? 'i-lucide-loader-circle'
                                                    : 'i-lucide-eye'
                                            "
                                            class="size-3 shrink-0"
                                            :class="{
                                                'animate-spin':
                                                    openingFileName ===
                                                    file.name,
                                            }"
                                        />
                                    </button>
                                    <!-- Download size; hidden when the backend
                                         reports 0 (file missing on server). -->
                                    <span
                                        v-if="file.size > 0"
                                        class="shrink-0 tabular-nums text-muted/70"
                                    >
                                        {{ formatFileSize(file.size) }}
                                    </span>
                                </span>
                                <!-- Per-file description from the API; hidden
                                     when the backend sends none. -->
                                <span
                                    v-if="file.description.trim()"
                                    class="block ps-[22px] text-muted/80 leading-snug"
                                >
                                    {{ file.description }}
                                </span>
                            </span>
                        </span>
                    </template>
                </UCheckbox>
                <UButton
                    :icon="
                        expandedIds.includes(doc.id)
                            ? 'i-lucide-chevron-up'
                            : 'i-lucide-chevron-down'
                    "
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    square
                    class="absolute end-2 top-2.5"
                    :aria-expanded="expandedIds.includes(doc.id)"
                    :aria-label="t('advisor.toggleDetails')"
                    @click="toggleExpand(doc.id)"
                />
            </div>
        </div>
    </div>
</template>
