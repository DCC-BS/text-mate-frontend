import { SavedPromptQuery } from "~/assets/queries/savedPrompt.query";
import type { SavedPrompt, SavedPromptInput } from "~/types/savedPrompt";
import {
    buildExport,
    EXPORT_FILE_NAME,
    findNewPrompts,
    MAX_IMPORT_BYTES,
    parseImport,
} from "~/utils/savedPromptTransfer";

// Module-level singleton state: the desktop and mobile ribbons share one list.
const prompts = ref<SavedPrompt[]>([]);
// The initial load, kept so IndexedDB is read once per page.
let loading: Promise<void> | undefined;

/**
 * Prompts the user saved in this browser ("Benutzerdefinierte Prompts").
 * Wraps `SavedPromptQuery` with reactive state, toasts, logging and JSON
 * export/import. Call `load()` from `onMounted`, never during SSR.
 */
export function useSavedPrompts() {
    const { t } = useI18n();
    const toast = useToast();
    const logger = useLogger();
    const query = useService(SavedPromptQuery);

    /** Shows a success toast. */
    function notifySuccess(title: string, description?: string): void {
        toast.add({
            title,
            description,
            color: "success",
            icon: "i-lucide-circle-check",
            duration: 3000,
        });
    }

    /** Shows an error toast. */
    function notifyError(description: string): void {
        toast.add({
            title: t("errors.title"),
            description,
            color: "error",
            icon: "i-lucide-circle-alert",
        });
    }

    /** Reads the current list from IndexedDB. */
    async function reload(): Promise<void> {
        prompts.value = await query.getAll();
    }

    /** Loads the list once; later calls reuse the first load. */
    function load(): Promise<void> {
        if (loading === undefined) {
            loading = reload().catch((error: unknown) => {
                logger.error(error, "Failed to load saved prompts");
                notifyError(t("savedPrompts.toast.loadError"));
                // Allow a later retry.
                loading = undefined;
            });
        }
        return loading;
    }

    /**
     * Runs a write, reloads the list and toasts the outcome.
     * @returns true when the write succeeded
     */
    async function write(
        operation: () => Promise<unknown>,
        successKey: string,
        logMessage: string,
    ): Promise<boolean> {
        try {
            await operation();
            await reload();
            notifySuccess(t(successKey));
            return true;
        } catch (error: unknown) {
            logger.error(error, logMessage);
            notifyError(t("savedPrompts.toast.error"));
            return false;
        }
    }

    /** Saves a new prompt. */
    function save(input: SavedPromptInput): Promise<boolean> {
        return write(
            () => query.add(input),
            "savedPrompts.toast.saved",
            "Failed to save prompt",
        );
    }

    /** Updates the name and text of a prompt. */
    function update(id: string, input: SavedPromptInput): Promise<boolean> {
        return write(
            () => query.update(id, input),
            "savedPrompts.toast.updated",
            "Failed to update prompt",
        );
    }

    /** Deletes a prompt. */
    function remove(id: string): Promise<boolean> {
        return write(
            () => query.remove(id),
            "savedPrompts.toast.deleted",
            "Failed to delete prompt",
        );
    }

    /** Downloads all prompts as `textmate-prompts.json`. */
    function exportToJson(): void {
        if (prompts.value.length === 0) {
            toast.add({
                title: t("savedPrompts.toast.exportEmpty"),
                color: "info",
                icon: "i-lucide-info",
                duration: 3000,
            });
            return;
        }

        const json = JSON.stringify(buildExport(prompts.value), null, 4);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = EXPORT_FILE_NAME;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        notifySuccess(t("savedPrompts.toast.exported"), EXPORT_FILE_NAME);
    }

    /** Imports prompts from an exported file, skipping exact duplicates. */
    async function importFromFile(file: File): Promise<void> {
        if (file.size > MAX_IMPORT_BYTES) {
            notifyError(t("savedPrompts.toast.importTooLarge"));
            return;
        }

        const result = parseImport(await file.text());
        if (!result.ok) {
            notifyError(t(`savedPrompts.toast.${result.error}`));
            return;
        }

        // Compare against the stored list, not a list that has not loaded yet.
        await load();
        const fresh = findNewPrompts(result.prompts, prompts.value);

        try {
            const added = fresh.length > 0 ? await query.addMany(fresh) : 0;
            await reload();
            notifySuccess(
                t("savedPrompts.toast.imported"),
                t("savedPrompts.toast.importedDetail", {
                    added,
                    skipped: result.prompts.length - added,
                }),
            );
        } catch (error: unknown) {
            logger.error(error, "Failed to import prompts");
            notifyError(t("savedPrompts.toast.error"));
        }
    }

    return {
        prompts: readonly(prompts),
        load,
        save,
        update,
        remove,
        exportToJson,
        importFromFile,
    };
}
