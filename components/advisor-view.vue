<script lang="ts" setup>
import type { AdvisorResponse } from '~/assets/models/advisor';


interface AdvisorViewProps {
    text: string;
    domain: string;
    formality: string;
}

const props = defineProps<AdvisorViewProps>();

const { t } = useI18n();
const { addProgress, removeProgress } = useUseProgressIndication();
const isLoading = ref(false);
const { sendError } = useUseErrorDialog();

const advisorData = ref<AdvisorResponse>();

async function giveAdvice() {
    advisorData.value = undefined;

    try {
        addProgress('advice', {
            icon: 'i-heroicons-light-bulb',
            title: t('status.advice')
        });
        isLoading.value = true;

        const body = {
            text: props.text,
            formality: props.formality,
            domain: props.domain,
        };

        advisorData.value = await $fetch<AdvisorResponse>('/api/advice', { body, method: 'POST' });
    } catch (e: any) {
        sendError(e.message);
    } finally {
        removeProgress('advice');
        isLoading.value = false;
    }
}
</script>

<template>
    <div v-if="advisorData" class="flex flex-col gap-2">
        <AdvisorScoreMeter v-model="advisorData.coherenceAndStructure" :label="t('advisor.coherenceAndStructure')" />
        <AdvisorScoreMeter v-model="advisorData.domainScore" :label="t('advisor.domainScore')" />
        <AdvisorScoreMeter v-model="advisorData.formalityScore" :label="t('advisor.formalityScore')" />

        <MDC :value="advisorData.proposedChanges" class="md-content" />
    </div>
    <div v-if="isLoading">
        <USkeleton class="w-full h-[300px]" />
    </div>
    <UButton @click="giveAdvice">{{ t('advisor.giveAdvice') }}</UButton>
</template>

<style>
.md-content {
    code {
        text-wrap: auto;
    }
}
</style>
