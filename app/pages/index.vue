<script setup lang="ts">
import type GrammarEditor from "~/components/GrammarEditor.vue";

const { data } = useAppAuth();
const userMail = computed(() => data.value?.user?.email ?? undefined);
</script>

<template>
    <div>
        <Changelogs />
        <FeedbackControl :default-mail="userMail" />
        <NavigationMenu />
        <div class="md:h-[calc(100vh-150px)]">
            <GrammarEditor />
            <DataBsFooter />
        </div>
    </div>
</template>
