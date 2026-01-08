import { useDropZone } from "@vueuse/core";
import { FetchError } from "ofetch";
import type { ConversionResult } from "~/assets/models/conversion-result";
import { useUseErrorDialog } from "./useErrorDialog";
/**
 * Composable for handling file conversion and drop zone functionality
 * @param onComplete Callback function that receives the converted text
 * @returns Object containing drop zone refs and state
 */
export function useFileConvert(onComplete: (text: string) => void) {
    const logger = useLogger();
    const { t } = useI18n();

    const dropZoneRef = ref<HTMLDivElement>();
    const isConverting = ref<boolean>(false);
    const error = ref<string | undefined>(undefined);
    const fileName = ref<string | undefined>(undefined);
    const abortController = ref(new AbortController());

    onUnmounted(() => {
        abortController.value.abort();
    });

    /**
     * Processes and converts a file to text
     * @param file File to be converted
     */
    async function processFile(file: File): Promise<void> {
        try {
            abortController.value.abort(); // Abort any ongoing conversion
            abortController.value = new AbortController();

            fileName.value = file.name;
            error.value = undefined;
            isConverting.value = true;

            const formData = new FormData();
            formData.append("file", file, file.name);

            const result = await $fetch<ConversionResult>("/api/convert", {
                method: "POST",
                body: formData,
                signal: abortController.value.signal,
            });

            if (result && result?.statusMessage === "Failed to convert file") {
                logger.error({ extra: result }, "File conversion error:");

                useUseErrorDialog().sendError(t("upload.errorDescription"));
                return;
            }

            if (result?.html?.startsWith('"') && result?.html?.endsWith('"')) {
                // remove " at start and end of the string
                result.html = result.html.slice(1, -1);
            }

            result.html = result.html.replace(/\\n/g, "\n"); // Replace escaped newlines with actual newlines
            result.html = result.html.replace(/\\t/g, "\t"); // Replace escaped tabs with actual tabs
            result.html = result.html.replace(/\\r/g, "\r"); // Replace escaped carriage returns with actual carriage returns

            onComplete(result.html);
        } catch (err) {
            error.value =
                err instanceof Error ? err.message : "Failed to convert file";
            if (err instanceof FetchError) {
                error.value = err.message ?? err.statusMessage;
            }

            logger.error(err, "File conversion error:");
            useUseErrorDialog().sendError(t("upload.errorDescription"));
        } finally {
            isConverting.value = false;
        }
    }

    /**
     * Handles file drop events
     * @param files Array of dropped files
     */
    async function onDrop(files: File[] | null): Promise<void> {
        if (files && files.length > 0 && files[0]) {
            await processFile(files[0]);
        }
    }

    const { isOverDropZone } = useDropZone(dropZoneRef, {
        onDrop,
        multiple: false,
    });

    /**
     * Handles file selection from file input
     * @param event File input change event
     */
    function handleFileSelect(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0 && input.files[0]) {
            processFile(input.files[0]);
        }
    }

    /**
     * Resets error state
     */
    function clearError(): void {
        error.value = undefined;
    }

    return {
        dropZoneRef,
        isOverDropZone,
        isConverting,
        error,
        fileName,
        processFile,
        handleFileSelect,
        clearError,
    };
}
