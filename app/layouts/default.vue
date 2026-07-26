<script setup lang="ts">
const route = useRoute();
const { disableOnboarding } = useRuntimeConfig().public;

const isAuth = computed(() => {
    return (
        route.fullPath.includes("/auth") || route.fullPath.includes("/login")
    );
});

const showOnboarding = computed(() => {
    return !isAuth.value && disableOnboarding !== "true";
});
</script>

<template>
    <div>
        <template v-if="!isAuth">
            <Disclaimer app-name="TextMate" />
            <OnboardingView v-if="showOnboarding" />
        </template>

        <slot />
    </div>
</template>
