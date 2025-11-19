<script setup lang="ts">
import type GrammarEditor from "~/components/grammar-editor.vue";

const { data } = useAuth();
const userMail = computed(() => data.value?.user?.email ?? undefined);
</script>

<template>
    <FeedbackControl :default-mail="userMail" />
    <NavigationMenu />
    <div class="md:h-[calc(100vh-150px)]">
        <GrammarEditor />
        <DataBsFooter />
    </div>
</template>
