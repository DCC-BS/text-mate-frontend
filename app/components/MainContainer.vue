<script setup lang="ts">
// refs
const userText = ref("");

// composables
const router = useRouter();

// check if the query param clipboard is true
const clipboard = router.currentRoute.value.query.clipboard;

// life cycle
onMounted(async () => {
    // Wait for next tick to ensure text editor is fully mounted
    await nextTick();

    if (clipboard && userText.value === "") {
        const text = await navigator.clipboard.readText();
        userText.value = text;
    }
});
</script>

<template>
    <div class="p-2 w-full h-full min-w-0">
        <div
            class="h-full w-full min-w-0 shadow-[2px_2px_1px_1px_#0000000D] ring-1 ring-default rounded-md flex flex-col overflow-hidden"
        >
            <WorkspaceContainer v-model="userText" />
        </div>
    </div>

    <div class="fixed bottom-5 left-0 right-0"><ProgressIndication /></div>
</template>
