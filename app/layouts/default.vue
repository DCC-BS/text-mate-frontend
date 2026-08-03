<script setup lang="ts">
import { useOnboading } from "~/composables/useOnboarding";

const route = useRoute();

const isAuth = computed(() => {
    return (
        route.fullPath.includes("/auth") || route.fullPath.includes("/login")
    );
});

const { driverBuilder } = useOnboading();
</script>

<template>
    <div>
        <template v-if="!isAuth">
            <FirstRunOrchestrator :onboarding-builder="driverBuilder" />
        </template>

        <slot />
    </div>
</template>
