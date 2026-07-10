export type RibbonTab = "transform" | "validate";

/**
 * Module-level active ribbon tab, shared so the onboarding tour can switch
 * tabs to point at elements that only exist on one tab.
 */
const ribbonTab = ref<RibbonTab>("transform");

export function useRibbonTab() {
    function setRibbonTab(tab: RibbonTab): void {
        ribbonTab.value = tab;
    }

    return {
        ribbonTab,
        setRibbonTab,
    };
}
