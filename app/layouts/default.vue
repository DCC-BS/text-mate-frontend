<script setup lang="ts">
const route = useRoute();

const isAuth = computed(() => {
    return (
        route.fullPath.includes("/auth") || route.fullPath.includes("/login")
    );
});
</script>

<template>
    <div>
        <template v-if="!isAuth">
            <Disclaimer app-name="TextMate" />
            <OnboardingView />
        </template>

        <slot />
    </div>
</template>
