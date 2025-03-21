<script lang="ts" setup>
import { UTabs } from '#components';
import { Cmds, type RewriteTextCommand } from '~/assets/models/commands';
import type { TextCorrectionBlock } from '~/assets/models/text-correction';

// definitions
interface ToolPanelProps {
    text: string;
    blocks: TextCorrectionBlock[];
}

const props = defineProps<ToolPanelProps>();

// composables
const { t } = useI18n();
const { registerHandler, unregisterHandler } = useCommandBus();

// refs
const selectedTab = ref(0);
const formality = ref<string>('neutral');
const domain = ref<string>('general');

onMounted(() => {
    registerHandler(Cmds.RewriteTextCommand, handleRewriteText);
});

onUnmounted(() => {
    unregisterHandler(Cmds.RewriteTextCommand, handleRewriteText);
});

const items = [{
    slot: 'problems',
    label: t('tools.problems'),
    icon: 'i-heroicons-bolt',
}, {
    slot: 'rewrite',
    label: t('tools.rewrite'),
    icon: 'i-heroicons-arrow-path-rounded-square-16-solid',
}, {
    slot: 'advisor',
    label: t('tools.advisor'),
    icon: 'i-heroicons-light-bulb',
}];

async function handleRewriteText(command: RewriteTextCommand): Promise<void> {
    selectedTab.value = 1;
}
</script>

<template>
    <div class="h-full p-2">
        <UTabs :items="items" v-model="selectedTab" class="h-full"
            :ui="{ container: 'h-[30vh] md:h-[90vh] overflow-y-auto scrollable-container', wrapper: 'h-[30vh] md:h-[90vh]' }">
            <template #problems>
                <ProblemsPanel :blocks="props.blocks" />
            </template>
            <template #rewrite>
                <div class="h-full">
                    <div class="grid grid-cols-2 mb-3 gap-2">
                        <span>{{ t('rewrite.formalityLabel') }}</span>
                        <SelectMenuLocalized v-model="formality" :options="['neutral', 'formal', 'informal']"
                            local-parent="rewrite.formality" />

                        <span>{{ t('rewrite.domainLabel') }}</span>
                        <SelectMenuLocalized v-model="domain"
                            :options="['general', 'report', 'email', 'socialMedia', 'technical']"
                            local-parent="rewrite.domain" />
                    </div>

                    <RewriteView :formality="formality" :domain="domain" />
                </div>
            </template>
            <template #advisor>
                <div class="grid grid-cols-2 mb-3 gap-2">
                    <span>{{ t('rewrite.formalityLabel') }}</span>
                    <SelectMenuLocalized v-model="formality" :options="['neutral', 'formal', 'informal']"
                        local-parent="rewrite.formality" />

                    <span>{{ t('rewrite.domainLabel') }}</span>
                    <SelectMenuLocalized v-model="domain"
                        :options="['general', 'report', 'email', 'socialMedia', 'technical']"
                        local-parent="rewrite.domain" />
                </div>

                <AdvisorView :domain="domain" :formality="formality" :text="props.text" />
            </template>
        </UTabs>
    </div>
</template>



<style lang="scss" scoped>
.tool-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 1px solid #e0e0e0;
}
</style>
