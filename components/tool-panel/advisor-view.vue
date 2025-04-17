<script lang="ts" setup>
import type { AdvisorResponse } from "~/assets/models/advisor";

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
        addProgress("advice", {
            icon: "i-heroicons-light-bulb",
            title: t("status.advice"),
        });
        isLoading.value = true;

        const body = {
            text: props.text,
            formality: props.formality,
            domain: props.domain,
        };

        advisorData.value = await $fetch<AdvisorResponse>("/api/advice", {
            body,
            method: "POST",
        });
    } catch (e: unknown) {
        if (e instanceof Error) {
            sendError(e.message);
        }
    } finally {
        removeProgress("advice");
        isLoading.value = false;
    }
}
</script>

<template>
    <UAlert 
        :title="t('advisor.comingSoon.title')"
        :icon="'i-heroicons-light-bulb'"
        :type="'info'"
        :class="['mt-4', 'mb-4']"
        :description="t('advisor.comingSoon.description')"
    />
</template>

<style>
.md-content {
    code {
        text-wrap: auto;
    }
}
</style>
