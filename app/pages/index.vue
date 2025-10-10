<script setup lang="ts">
import type GrammarEditor from "~/components/grammar-editor.vue";

const { data } = useAuth();
const userMail = computed(() => data.value?.user?.email ?? undefined);

// Ref for GrammarEditor to control tour
const grammarEditorRef = ref<InstanceType<typeof GrammarEditor>>();

// Handle tour restart from NavigationMenu
function handleRestartTour(): void {
    grammarEditorRef.value?.startTour();
}
</script>

<template>
    <FeedbackControl :default-mail="userMail" />
    <NavigationMenu @restart-tour="handleRestartTour" />
    <div class="md:h-[calc(100vh-150px)]">
        <GrammarEditor ref="grammarEditorRef" />
        <DataBsFooter />
    </div>
</template>
