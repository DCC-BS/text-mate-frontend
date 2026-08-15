<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref, watch } from "vue";

// Import will be handled client-side only
const PdfEmbed = defineAsyncComponent(() =>
    import("vue-pdf-embed").then((module) => module.default),
);

import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

interface AdvisorPdfViewerProps {
    file: Blob;
    fileName: string;
    page: number;
}

const props = defineProps<AdvisorPdfViewerProps>();
const emit = defineEmits<{
    close: [];
}>();

const { t } = useI18n();

const currentPage = ref(props.page || 1);
const totalPages = ref(0);
const pdfSource = ref<string | ArrayBuffer | undefined>(undefined);
const pdfInstance = ref<unknown>(undefined);
const zoomLevel = ref(100);
const containerRef = ref<HTMLElement | undefined>(undefined);

/**
 * Convert Blob to data URL for embedding
 */
function convertBlobToSource(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = (event) => {
        if (event.target) {
            pdfSource.value = event.target.result ?? undefined;
        }
    };
    reader.readAsArrayBuffer(blob);
}

/**
 * Navigate to a specific page
 */
function goToPage(pageNumber: number): void {
    if (pageNumber > 0 && pageNumber <= totalPages.value) {
        currentPage.value = pageNumber;
    }
}

/**
 * Handle when PDF document is loaded
 */
function handleDocumentLoaded(pdfDocument: PDFDocumentProxy): void {
    // Get the number of pages from the PDF document
    totalPages.value = pdfDocument.numPages;

    // Navigate to the specified page once document is loaded
    goToPage(props.page);
}

/**
 * Increase zoom level by the specified percentage
 */
function zoomIn(): void {
    if (zoomLevel.value < 300) {
        zoomLevel.value += 25;
    }
}

/**
 * Decrease zoom level by the specified percentage
 */
function zoomOut(): void {
    if (zoomLevel.value > 50) {
        zoomLevel.value -= 25;
    }
}

/**
 * Reset zoom level to 100%
 */
function resetZoom(): void {
    zoomLevel.value = 100;
}

/**
 * Handle wheel events for zooming with ctrl+wheel
 */
function handleWheel(event: WheelEvent): void {
    if (event.shiftKey) {
        event.preventDefault();
        if (event.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    }
}

/**
 * Download the current PDF file
 */
function downloadPdf(): void {
    if (!props.file || !props.fileName) {
        return;
    }

    // Create a download URL from the file blob
    const url = URL.createObjectURL(props.file);

    // Create a temporary anchor element
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = props.fileName; // Use the fileName prop as download name

    // Append to the document, trigger click, and clean up
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Release the object URL
    URL.revokeObjectURL(url);
}

/**
 * Close the PDF viewer modal
 */
function closeModal(): void {
    emit("close");
}

onMounted(() => {
    // Initialize PDF source from file prop
    if (props.file) {
        convertBlobToSource(props.file);
    }
});

watch(
    containerRef,
    (el, oldEl) => {
        oldEl?.removeEventListener("wheel", handleWheel);
        el?.addEventListener("wheel", handleWheel, { passive: false });
    },
    { immediate: true },
);

onUnmounted(() => {
    containerRef.value?.removeEventListener("wheel", handleWheel);
});

// Watch for changes to the page prop
watch(
    () => props.page,
    (newPage) => {
        goToPage(newPage);
    },
);

// Watch for changes to the file prop
watch(
    () => props.file,
    (newFile) => {
        if (newFile) {
            convertBlobToSource(newFile);
        }
    },
);
</script>

<template>
    <UModal fullscreen class="p-2">
        <template #content>
            <div class="flex flex-col h-full w-full overflow-hidden">
                <!-- Header with close button -->
                <div
                    class="flex justify-between items-center p-3 bg-gray-200 border-b border-gray-300"
                >
                    <div
                        class="text-sm font-medium text-gray-800 truncate overflow-hidden whitespace-nowrap max-w-[40%]"
                    >
                        {{ fileName }}
                    </div>
                    <button
                        type="button"
                        class="p-1 hover:bg-gray-300 rounded-full"
                        @click="closeModal"
                        :aria-label="t('advisor.pdfViewer.close')"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <title>{{ t("advisor.pdfViewer.close") }}</title>
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <!-- PDF Document Container with zoom -->
                <div
                    ref="containerRef"
                    v-if="pdfSource"
                    class="flex-1 overflow-auto bg-gray-100 p-4"
                >
                    <div
                        class="pdf-container"
                        :style="{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }"
                    >
                        <PdfEmbed
                            :source="pdfSource"
                            :width="containerRef ? containerRef.clientWidth : 0"
                            :page="currentPage"
                            @loaded="handleDocumentLoaded"
                            @update:instance="pdfInstance = $event"
                        />
                    </div>
                </div>
                <div
                    v-else
                    class="flex items-center justify-center h-full w-full"
                >
                    <div
                        class="p-6 bg-black/5 rounded-md flex flex-col items-center"
                    >
                        <!-- Loading spinner animation with pulsing effect -->
                        <div class="spinner-container mb-3">
                            <div
                                class="spinner border-t-4 border-blue-500 border-solid rounded-full w-12 h-12 animate-spin"
                            ></div>
                        </div>
                    </div>
                </div>

                <!-- Footer with page navigation and zoom controls -->
                <div
                    v-if="pdfSource"
                    class="flex justify-between items-center p-3 bg-gray-100 border-t border-gray-300"
                >
                    <div class="flex items-center gap-2">
                        <!-- Zoom controls -->
                        <button
                            type="button"
                            class="py-1 px-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="zoomLevel <= 50"
                            @click="zoomOut"
                            :aria-label="t('advisor.pdfViewer.zoomOut')"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <title>
                                    {{ t("advisor.pdfViewer.zoomOut") }}
                                </title>
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M20 12H4"
                                />
                            </svg>
                        </button>
                        <span class="text-sm">{{ zoomLevel }}%</span>
                        <button
                            type="button"
                            class="py-1 px-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="zoomLevel >= 300"
                            @click="zoomIn"
                            :aria-label="t('advisor.pdfViewer.zoomIn')"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <title>
                                    {{ t("advisor.pdfViewer.zoomIn") }}
                                </title>
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                        </button>
                        <button
                            type="button"
                            class="py-1 px-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 ml-1"
                            @click="resetZoom"
                        >
                            {{ t("advisor.pdfViewer.resetZoom") }}
                        </button>

                        <!-- Download button -->
                        <button
                            type="button"
                            class="py-1 px-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 ml-2 flex items-center gap-1"
                            @click="downloadPdf"
                            :aria-label="t('advisor.pdfViewer.downloadPdf')"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <title>
                                    {{ t("advisor.pdfViewer.downloadPdf") }}
                                </title>
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                            </svg>
                            {{ t("advisor.pdfViewer.download") }}
                        </button>
                    </div>

                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            class="py-1 px-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="currentPage <= 1"
                            @click="goToPage(currentPage - 1)"
                        >
                            {{ t("advisor.pdfViewer.prevPage") }}
                        </button>
                        <span class="mx-2 text-sm"
                            >{{ t("advisor.pdfViewer.pageIndicator", {
                                current: currentPage,
                                total: totalPages,
                            }) }}</span
                        >
                        <button
                            type="button"
                            class="py-1 px-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="currentPage >= totalPages"
                            @click="goToPage(currentPage + 1)"
                        >
                            {{ t("advisor.pdfViewer.nextPage") }}
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>

<style scoped>
/* Loading spinner animation styles */
.spinner {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

/* PDF container styles */
.pdf-container {
    transition: transform 0.2s ease-in-out;
    display: inline-block;
    background-color: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
