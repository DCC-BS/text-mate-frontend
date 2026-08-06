<script lang="ts" setup>
import type { RibbonTransformProps } from "~/types/ribbon";
import type { TextActions } from "~~/shared/text-actions";
import CharacterSpeechAction from "../rewrite/quick-action/CharacterSpeechAction.vue";
import CustomAction from "../rewrite/quick-action/CustomAction.vue";
import FormalityAction from "../rewrite/quick-action/FormalityAction.vue";
import MediumAction from "../rewrite/quick-action/MediumAction.vue";
import SocialMediaAction from "../rewrite/quick-action/SocialMediaAction.vue";
import SummarizeAction from "../rewrite/quick-action/SummarizeAction.vue";
import UserActions from "../rewrite/quick-action/UserActions.vue";

const props = defineProps<RibbonTransformProps>();

const emit = defineEmits<{
    clear: [];
    "update:selectedDocs": [string[]];
}>();

const { t } = useI18n();
const { runQuickAction } = useQuickAction();
const toast = useToast();

const actionsAreAvailable = computed(
    () => props.editable && !props.busy && props.text.trim().length > 0,
);

async function applyAction(
    action: TextActions | string,
    config?: string,
): Promise<void> {
    if (!actionsAreAvailable.value) {
        toast.add({
            title: "Error",
            description: "No text to process",
            color: "error",
            icon: "i-lucide-circle-alert",
        });
        return;
    }

    await runQuickAction({
        action,
        text: props.text,
        options: config ?? "",
    });
}
</script>

<template>
    <div
        class="flex items-stretch gap-3 w-full min-w-0 flex-nowrap overflow-x-auto md:flex-wrap md:justify-center md:overflow-x-visible pb-1 md:pb-0"
    >
        <!-- Restructure -->
        <RibbonGroup :label="t('ribbon.restructure')" icon="i-lucide-list-tree">
            <SummarizeAction
                :actions-are-available="actionsAreAvailable"
                @apply-action="applyAction"
            />
            <RibbonIconButton
                :label="t('editor.bullet_points')"
                icon="i-lucide-list"
                :disabled="!actionsAreAvailable"
                @click="applyAction('bullet_points')"
            />
        </RibbonGroup>

        <RibbonDivider />

        <!-- Rewrite for -->
        <RibbonGroup :label="t('ribbon.rewriteFor')" icon="i-lucide-pen-line">
            <SocialMediaAction
                :actions-are-available="actionsAreAvailable"
                @apply-action="applyAction"
            />
            <MediumAction
                :actions-are-available="actionsAreAvailable"
                @apply-action="applyAction"
            />
            <CharacterSpeechAction
                :actions-are-available="actionsAreAvailable"
                @apply-action="applyAction"
            />
            <FormalityAction
                :actions-are-available="actionsAreAvailable"
                @apply-action="applyAction"
            />
        </RibbonGroup>

        <RibbonDivider />

        <!-- Polish -->
        <RibbonGroup :label="t('ribbon.polish')" icon="i-lucide-sparkles">
            <RibbonIconButton
                :label="t('editor.plain_language')"
                icon="i-lucide-book-open"
                :disabled="!actionsAreAvailable"
                @click="applyAction('plain_language')"
            />
            <RibbonIconButton
                :label="t('editor.proofread')"
                icon="i-lucide-check"
                :disabled="!actionsAreAvailable"
                @click="applyAction('proofread')"
            />
        </RibbonGroup>

        <RibbonDivider />

        <!-- Custom + My Actions -->
        <RibbonGroup :label="t('actions.custom')" icon="i-lucide-wand-2">
            <CustomAction
                :actions-are-available="actionsAreAvailable"
                @apply-action="applyAction"
            />
            <UserActions
                :actions-are-available="actionsAreAvailable"
                @apply-action="applyAction"
            />
        </RibbonGroup>
    </div>
</template>
