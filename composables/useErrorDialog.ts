/**
 * Provides methods to display error dialogs.
 *
 * @returns An object containing the method to send an error.
 */
export const useUseErrorDialog = () => {
    return { sendError };
};

/**
 * Sends an error message to be displayed in a toast notification.
 *
 * @param error - The error message to display.
 */
function sendError(error: string) {
    const toast = useToast();

    toast.add({
        title: "Error",
        description: error,
        color: "error",
        icon: "i-heroicons-exclamation-circle",
    });
}
