<script setup lang="ts">
const { $pwa } = useNuxtApp();

const { t } = useI18n();

const route = useRoute();

const isAuth = computed(() => {
    return (
        route.fullPath.includes("/auth") || route.fullPath.includes("/login")
    );
});

onMounted(() => {
    // Remove all service workers and caches in the client
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
                registration.unregister();
            }
        });
    }

    if ("caches" in window) {
        caches
            .keys()
            .then((keyList) =>
                Promise.all(keyList.map((key) => caches.delete(key))),
            );
    }
});
</script>

<template>
    <template v-if="!isAuth">
        <Disclaimer app-name="TextMate" />
    </template>

    <UApp>
        <NuxtPage />
    </UApp>
</template>
