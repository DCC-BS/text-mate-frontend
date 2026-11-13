import { apiStreamFetch, isApiError } from "@dcc-bs/communication.bs.js";
import {
    BeginTextActionCommand,
    CancelTextActionCommand,
    ExecuteTextActionCommand,
    type QuickActionRequest,
} from "~/assets/models/commands";

/**
 * The last quick action request that was run, kept so it can be re-run (retry).
 * Module-level so the panel and the retry handler share the same value.
 */
const lastRequest = ref<QuickActionRequest | undefined>(undefined);

/**
 * True from the moment a quick action is sent until its stream has been fully
 * consumed (or the request failed). Guards against duplicate submissions while
 * the request waits in the backend queue.
 */
const isRunning = ref(false);

/**
 * Owns the quick action network call and remembers the last request so it can be
 * re-run via {@link RetryQuickActionCommand}.
 */
export function useQuickAction() {
    const { executeCommand } = useCommandBus();
    const { t } = useI18n();
    const toast = useToast();

    /**
     * Sends the quick action to the backend and applies the streamed result.
     * @returns true on success, false when the backend returned an error.
     */
    async function runQuickAction(
        request: QuickActionRequest,
    ): Promise<boolean> {
        if (isRunning.value) {
            return false;
        }
        isRunning.value = true;

        // Show the "generating" state immediately: the backend may queue the
        // request for a while before the first byte (and headers) arrive.
        await executeCommand(new BeginTextActionCommand());

        try {
            const response = await apiStreamFetch("/api/quick-action", {
                method: "POST",
                body: {
                    action: request.action,
                    text: request.text,
                    options: request.options,
                },
            });

            if (isApiError(response)) {
                await executeCommand(new CancelTextActionCommand());
                toast.add({
                    title: "Error",
                    description:
                        t(`errors.${response.errorId}`) || response.message,
                    color: "error",
                    icon: "i-lucide-circle-alert",
                });
                return false;
            }

            lastRequest.value = request;
            await executeCommand(new ExecuteTextActionCommand(response));
            return true;
        } catch (error: unknown) {
            await executeCommand(new CancelTextActionCommand());
            toast.add({
                title: "Error",
                description:
                    error instanceof Error ? error.message : String(error),
                color: "error",
                icon: "i-lucide-circle-alert",
            });
            return false;
        } finally {
            isRunning.value = false;
        }
    }

    return {
        lastRequest: readonly(lastRequest),
        hasLastRequest: computed(() => lastRequest.value !== undefined),
        isRunning: readonly(isRunning),
        runQuickAction,
    };
}
