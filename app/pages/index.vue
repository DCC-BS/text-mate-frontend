<script setup lang="ts">
const config = useRuntimeConfig();
const { data } = useAppAuth();
const userMail = computed(() => data.value?.user?.email ?? undefined);
</script>

<template>
    <div>
        <Changelogs />
        <template v-if="config.public.useFeedback">
            <FeedbackControl :default-mail="userMail" />
        </template>
        <div class="md:h-[calc(100vh-5px)] grid grid-rows-[auto_1fr_auto]">
            <NavigationMenu />
            <MainContainer />
            <DataBsFooter size="sm" class="p-2" />
        </div>
    </div>
</template>
