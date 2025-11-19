export interface UseFileUploadOptions {
    onFileConverted: (text: string) => void;
}

export function useTextFileUpload(options: UseFileUploadOptions) {
    const { onFileConverted } = options;

    const {
        dropZoneRef,
        isOverDropZone,
        isConverting,
        error: conversionError,
        fileName,
        handleFileSelect,
        clearError,
    } = useFileConvert(onFileConverted);

    const { t } = useI18n();
    const toast = useToast();
    const fileInputRef = ref<HTMLInputElement | null>(null);
    const lockEditor = ref(false);

    /**
     * Watch for error changes to show error toast
     */
    watch(conversionError, (newError) => {
        if (newError) {
            toast.add({
                title: t("upload.error"),
                description: `${newError}. ${t("upload.errorDescription")}`,
                color: "error",
                icon: "i-lucide-alert-circle",
                duration: 5000,
                actions: [
                    {
                        label: t("upload.dismiss"),
                        onClick: () => clearError(),
                    },
                ],
            });
        }
    });

    /**
     * Watch for fileName changes to show success toast
     */
    watch(
        () => fileName.value,
        (newFileName, oldFileName) => {
            if (
                newFileName &&
                !conversionError.value &&
                !isConverting.value &&
                newFileName !== oldFileName
            ) {
                toast.add({
                    title: t("upload.fileConvertedSuccess"),
                    description: newFileName,
                    color: "success",
                    icon: "i-lucide-check-circle",
                    duration: 3000,
                });
            }
        },
    );

    /**
     * Watch for conversion state to lock/unlock editor
     */
    watch(isConverting, (value) => {
        lockEditor.value = value;
    });

    /**
     * Triggers file upload dialog
     */
    function triggerFileUpload(): void {
        if (fileInputRef.value) {
            fileInputRef.value.click();
        }
    }

    /**
     * Handles file selection from input
     */
    function onFileSelect(event: Event): void {
        handleFileSelect(event);
        // Reset the input so the same file can be selected again
        if (fileInputRef.value) {
            fileInputRef.value.value = "";
        }
    }

    return {
        // Refs
        dropZoneRef,
        fileInputRef,
        lockEditor,

        // State
        isOverDropZone,
        isConverting,
        conversionError,
        fileName,

        // Methods
        triggerFileUpload,
        onFileSelect,
        clearError,
    };
}
