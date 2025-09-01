<script setup lang="ts">

const { data} = useAuth();
const userMail = computed(() => (data.value?.user?.email ?? undefined));
</script>

<template>
    <FeedbackControl :default-mail="userMail" />
    <NavigationMenu />
    <GrammarEditor />
</template>