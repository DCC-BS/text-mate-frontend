<script setup lang="ts">
import type GrammarEditor from "~/components/GrammarEditor.vue";

const config = useRuntimeConfig();
const { data } = useAppAuth();
const userMail = computed(() => data.value?.user?.email ?? undefined);
</script>

<template>
    <div>
        <Changelogs />
        <template v-if="config.useFeedback">
            <FeedbackControl :default-mail="userMail" />
        </template>
        <NavigationMenu />
        <div class="md:h-[calc(100vh-150px)]">
            <GrammarEditor />
            <DataBsFooter />
        </div>
    </div>
</template>
