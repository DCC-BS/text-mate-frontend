<script setup lang="ts">
const config = useRuntimeConfig();
const { data } = useAppAuth();
const userMail = computed(() => data.value?.user?.email ?? undefined);
</script>

<template>
    <div>
        <div class="h-[calc(100dvh-5px)] grid grid-rows-[auto_1fr_auto]">
            <NavigationMenu />
            <MainContainer />
            <DataBsFooter size="sm" class="p-2">
                <template #right>
                    <div
                        class="flex justify-end"
                        v-if="config.public.useFeedback"
                    >
                        <FeedbackControl :default-mail="userMail" inline />
                    </div>
                </template>
            </DataBsFooter>
        </div>
    </div>
</template>
