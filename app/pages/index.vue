<script setup lang="ts">
const config = useRuntimeConfig();
const { data } = useAppAuth();
const userMail = computed(() => data.value?.user?.email ?? undefined);
</script>

<template>
    <div>
        <div class="h-screen grid grid-rows-[auto_minmax(0,1fr)_auto]">
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
