<script setup lang="ts">
import { ApplyFixCommand, CheckCommand } from "~/assets/models/commands";
import type { TextActions } from "~~/shared/text-actions";
import CharacterSpeechAction from "./rewrite/quick-action/CharacterSpeechAction.vue";
import CustomAction from "./rewrite/quick-action/CustomAction.vue";
import FormalityAction from "./rewrite/quick-action/FormalityAction.vue";
import MediumAction from "./rewrite/quick-action/MediumAction.vue";
import SocialMediaAction from "./rewrite/quick-action/SocialMediaAction.vue";
import SummarizeAction from "./rewrite/quick-action/SummarizeAction.vue";
import UserActions from "./rewrite/quick-action/UserActions.vue";

interface Props {
    /** Current Working Text, sent to the backend with each transform action. */
    text: string;
    /** True while a stream/diff is in progress — disables all actions. */
    busy: boolean;
    /** True while the editor accepts edits. */
    editable: boolean;
    selectedDocs: string[];
    maxDocs: number;
    toFixCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    clear: [];
    "update:selectedDocs": [string[]];
}>();

const { t } = useI18n();
const { runQuickAction } = useQuickAction();
const { executeCommand } = useCommandBus();
const toast = useToast();
const { ribbonTab: activeTab, setRibbonTab } = useRibbonTab();

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

const selectedDocsModel = computed({
    get: () => props.selectedDocs,
    set: (value: string[]) => emit("update:selectedDocs", value),
});
</script>

<template>
    <div class="border-b border-default" data-tour="ribbon">
        <!-- Tab bar -->
        <div class="flex justify-center items-end gap-1 px-2 pt-1">
            <UButton
                :variant="activeTab === 'transform' ? 'soft' : 'link'"
                :color="activeTab === 'transform' ? 'primary' : 'neutral'"
                size="sm"
                icon="i-lucide-wand-sparkles"
                data-tour="ribbon-transform"
                @click="setRibbonTab('transform')"
            >
                {{ t("ribbon.transform") }}
            </UButton>
            <UButton
                :variant="activeTab === 'validate' ? 'soft' : 'link'"
                :color="activeTab === 'validate' ? 'primary' : 'neutral'"
                size="sm"
                icon="i-lucide-file-search"
                data-tour="ribbon-validate"
                @click="setRibbonTab('validate')"
            >
                {{ t("ribbon.validate") }}
            </UButton>
        </div>

        <!-- Ribbon body -->
        <div class="flex items-stretch gap-0 px-2 pb-1.5 pt-1">
            <!-- TRANSFORM TAB -->
            <div
                v-if="activeTab === 'transform'"
                class="flex justify-center items-stretch gap-3 w-full flex-wrap"
                data-tour="quick-actions"
            >
                <!-- Restructure -->
                <RibbonGroup
                    :label="t('ribbon.restructure')"
                    icon="i-lucide-list-tree"
                >
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
                <RibbonGroup
                    :label="t('ribbon.rewriteFor')"
                    icon="i-lucide-pen-line"
                >
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
                <RibbonGroup
                    :label="t('ribbon.polish')"
                    icon="i-lucide-sparkles"
                >
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
                <RibbonGroup
                    :label="t('actions.custom')"
                    icon="i-lucide-wand-2"
                >
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

            <!-- VALIDATE TAB -->
            <div v-else class="flex justify-center items-stretch gap-3 w-full">
                <!-- Reference documents -->
                <RibbonGroup
                    :label="t('ribbon.refDocs')"
                    icon="i-lucide-book-open"
                >
                    <UPopover mode="click" :content-align="{ align: 'start' }">
                        <RibbonIconButton
                            :label="
                                selectedDocs.length === 0
                                    ? t('ribbon.refDocs')
                                    : `${selectedDocs.length}/${maxDocs}`
                            "
                            icon="i-lucide-files"
                        />
                        <template #content>
                            <div class="p-2 w-[320px] max-w-[80vw]">
                                <p class="text-xs text-muted mb-2">
                                    {{ t("ribbon.refDocsCount", {
                                            n: selectedDocs.length,
                                            max: maxDocs,
                                        }) }}
                                </p>
                                <AdvisorDocSelect v-model="selectedDocsModel" />
                            </div>
                        </template>
                    </UPopover>
                </RibbonGroup>

                <RibbonDivider />

                <!-- Check / Fix -->
                <RibbonGroup
                    :label="t('ribbon.validate')"
                    icon="i-lucide-file-search"
                >
                    <RibbonIconButton
                        :label="t('ribbon.check')"
                        icon="i-lucide-search-check"
                        :disabled="
                            !editable || busy || selectedDocs.length === 0
                        "
                        @click="executeCommand(new CheckCommand())"
                    />
                    <RibbonIconButton
                        :label="t('ribbon.fix')"
                        icon="i-lucide-wrench"
                        :disabled="!editable || busy || toFixCount === 0"
                        @click="executeCommand(new ApplyFixCommand())"
                    />
                </RibbonGroup>

                <RibbonDivider />

                <!-- Clear -->
                <RibbonGroup :label="t('ribbon.clear')" icon="i-lucide-eraser">
                    <RibbonIconButton
                        :label="t('ribbon.clear')"
                        icon="i-lucide-trash-2"
                        :disabled="busy"
                        @click="emit('clear')"
                    />
                </RibbonGroup>
            </div>
        </div>
    </div>
</template>
