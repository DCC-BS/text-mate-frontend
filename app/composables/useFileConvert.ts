import { useDropZone } from "@vueuse/core";
import { FetchError } from "ofetch";
import { z } from "zod";
import type { ConversionResult } from "~/assets/models/conversion-result";

const ErrorPayloadSchema = z.object({
    errorId: z.string().optional(),
});

/**
 * Composable for handling file conversion and drop zone functionality
 * @param onComplete Callback function that receives the converted HTML content
 * @returns Object containing drop zone refs and state
 */
export function useFileConvert(onComplete: (htmlContent: string) => void) {
    const logger = useLogger();
    const { t, te } = useI18n();

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
        abortController.value.abort(); // Abort any ongoing conversion
        const currentController = new AbortController();
        abortController.value = currentController;

        fileName.value = file.name;
        error.value = undefined;
        isConverting.value = true;

        try {
            const formData = new FormData();
            formData.append("file", file, file.name);

            const result = await $fetch<ConversionResult>("/api/convert", {
                method: "POST",
                body: formData,
                signal: currentController.signal,
            });

            if (
                abortController.value !== currentController ||
                currentController.signal.aborted
            ) {
                return;
            }

            if (result && result?.statusMessage === "Failed to convert file") {
                logger.error({ extra: result }, "File conversion error:");
                error.value = t("errors.document_conversion_error");
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
        } catch (err: unknown) {
            if (
                abortController.value !== currentController ||
                currentController.signal.aborted
            ) {
                return;
            }

            let errorId: string | undefined;
            if (err instanceof FetchError && err.data) {
                const parsed = ErrorPayloadSchema.safeParse(err.data);
                if (parsed.success && typeof parsed.data.errorId === "string") {
                    errorId = parsed.data.errorId;
                }
            }

            const localizedErrorMessage =
                errorId && te(`errors.${errorId}`)
                    ? t(`errors.${errorId}`)
                    : t("errors.document_conversion_error");

            error.value = localizedErrorMessage;
            logger.error({ err, errorId }, "File conversion error:");
        } finally {
            if (abortController.value === currentController) {
                isConverting.value = false;
            }
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
     * Handles file selection from input
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
