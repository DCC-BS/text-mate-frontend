<script setup lang="ts">
const route = useRoute();

const isAuth = computed(() => {
    return (
        route.fullPath.includes("/auth") || route.fullPath.includes("/login")
    );
});
</script>

<template>
    <template v-if="!isAuth">
        <Disclaimer app-name="TextMate" />
        <Onboarding />
    </template>

    <slot />
</template>
