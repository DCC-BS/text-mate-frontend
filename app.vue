<script setup lang="ts">
import GrammarEditor from "./components/grammar-editor.vue";
</script>

<template>
    <NuxtPwaManifest />
    <FeedbackControl />
    <UApp>
        <NavigationMenu />
        <NuxtPage />
    </UApp>
</template>
