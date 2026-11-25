import type { Editor } from "@tiptap/core";
import type { WordExportSettings } from "~/types/wordExport";
import {
    DEFAULT_WORD_EXPORT_SETTINGS,
    parseWordExportSettings,
    WORD_EXPORT_STORAGE_KEY,
    wordExportFilename,
    wordExportSettingsSchema,
} from "~/utils/wordExportSettings";

/** Coordinate browser-only export and optional persistence without modifying editor content. */
export function useWordExport() {
    const { t } = useI18n();
    const toast = useToast();
    const isOpen = ref(false);
    const isExporting = ref(false);
    const settings = ref<WordExportSettings>({
        ...DEFAULT_WORD_EXPORT_SETTINGS,
    });
    const filename = ref("");

    function open(): void {
        try {
            settings.value = parseWordExportSettings(
                localStorage.getItem(WORD_EXPORT_STORAGE_KEY),
            );
        } catch {
            settings.value = { ...DEFAULT_WORD_EXPORT_SETTINGS };
            storageError();
        }
        filename.value = `textmate-${new Date().toISOString().slice(0, 10)}`;
        isOpen.value = true;
    }

    function storageError(): void {
        toast.add({ title: t("wordExport.storageFailed"), color: "error" });
    }

    function saveDefaults(): void {
        try {
            const valid = wordExportSettingsSchema.parse(settings.value);
            localStorage.setItem(
                WORD_EXPORT_STORAGE_KEY,
                JSON.stringify(valid),
            );
            toast.add({ title: t("wordExport.saved"), color: "success" });
        } catch {
            storageError();
        }
    }

    async function download(editor: Editor): Promise<void> {
        if (isExporting.value || editor.isDestroyed || editor.isEmpty) return;
        isExporting.value = true;
        try {
            // Snapshot before the lazy import so this download represents the user's click.
            const json = editor.getJSON();
            const valid = wordExportSettingsSchema.parse(settings.value);
            const name = wordExportFilename(filename.value);
            const { tiptapToDocx } = await import(
                "~/utils/tiptapToDocx.client"
            );
            const blob = await tiptapToDocx(json, valid);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            try {
                link.href = url;
                link.download = name;
                document.body.appendChild(link);
                link.click();
            } finally {
                link.remove();
                // Give the browser time to consume the download before releasing it.
                setTimeout(function releaseDownload() {
                    URL.revokeObjectURL(url);
                }, 1000);
            }
            isOpen.value = false;
            toast.add({
                title: t("toolbar.downloadSuccess"),
                description: name,
                color: "success",
            });
        } catch {
            toast.add({
                title: t("toolbar.downloadFailed"),
                description: t("wordExport.exportFailed"),
                color: "error",
            });
        } finally {
            isExporting.value = false;
        }
    }

    return {
        isOpen,
        isExporting,
        settings,
        filename,
        open,
        saveDefaults,
        download,
    };
}
