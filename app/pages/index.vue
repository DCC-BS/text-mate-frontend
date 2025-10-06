<script setup lang="ts">
const { data } = useAuth();
const userMail = computed(() => data.value?.user?.email ?? undefined);
</script>

<template>
    <FeedbackControl :default-mail="userMail" />
    <NavigationMenu />
    <div class="md:h-[calc(100vh-100px)] flex flex-col">
        <GrammarEditor />
        <DataBsFooter />
    </div>
</template>