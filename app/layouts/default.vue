<script setup lang="ts">
import { Disclaimer } from "@dcc-bs/common-ui.bs.js";

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
    </template>
    
    <slot />
</template>
