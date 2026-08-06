import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";

/**
 * The onboarding tour is desktop-only. The restart button itself lives in the
 * `common-ui` library (`OnboardingRestartButton`, rendered inside `NavigationBar`)
 * and simply flips the `tour-completed` cookie — which is a silent no-op on
 * mobile once the builder is gated off. Intercept its click via the stable
 * `data-tour="start-tour"` hook and surface a toast instead.
 *
 * Returns the one-shot desktop flag so callers can gate the builder on the same
 * snapshot (a mid-session resize must not start or abort a tour).
 */
export function useMobileOnboardingGuard(): { isDesktop: boolean } {
    const isDesktop =
        useBreakpoints(breakpointsTailwind).greaterOrEqual("md").value;

    const { t } = useI18n();
    const toast = useToast();

    function onClick(event: MouseEvent): void {
        if (isDesktop) return;
        const target = event.target as Element | null;
        if (!target?.closest('[data-tour="start-tour"]')) return;
        // Stop the event before it reaches the library handler so the cookie
        // isn't flipped (a stale "not completed" could otherwise auto-trigger
        // the tour if the user later opens the app on desktop).
        event.stopPropagation();
        toast.add({
            title: t("tour.unavailable.title"),
            description: t("tour.unavailable.content"),
            color: "info",
            icon: "i-lucide-monitor",
            duration: 5000,
        });
    }

    onMounted(() => {
        document.addEventListener("click", onClick, true);
    });

    onUnmounted(() => {
        document.removeEventListener("click", onClick, true);
    });

    return { isDesktop };
}
