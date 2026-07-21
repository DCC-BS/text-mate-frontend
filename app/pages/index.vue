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
        <NavigationMenu />
        <div class="md:h-[calc(100vh-135px)]">
            <MainContainer />
            <DataBsFooter />
        </div>
    </div>
</template>
