<script setup lang="ts">
const route = useRoute();

const isAuth = computed(() => {
    return (
        route.fullPath.includes("/auth") || route.fullPath.includes("/login")
    );
});
</script>

<template>
    <UApp>
        <Onboarding v-if="!isAuth" />

        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>
