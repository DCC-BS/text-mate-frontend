<script setup lang="ts">
import { useMobileOnboardingGuard } from "~/composables/useMobileOnboardingGuard";
import { useOnboading } from "~/composables/useOnboarding";

const route = useRoute();

const isAuth = computed(() => {
    return (
        route.fullPath.includes("/auth") || route.fullPath.includes("/login")
    );
});

const { driverBuilder } = useOnboading();

// The onboarding tour is desktop-only. `useMobileOnboardingGuard` snapshots the
// viewport once at load (so a resize can't start/abort a tour mid-session) and,
// on mobile, surfaces a toast when the restart button is clicked.
const { isDesktop } = useMobileOnboardingGuard();
</script>

<template>
    <div>
        <template v-if="!isAuth">
            <FirstRunOrchestrator
                :onboarding-builder="isDesktop ? driverBuilder : undefined"
            />
        </template>

        <slot />
    </div>
</template>
