<script setup lang="ts">
import type { ValidationProgress } from "~/assets/models/advisor";

interface InputProps {
    progress: ValidationProgress;
}

const props = defineProps<InputProps>();

const { t } = useI18n();
</script>

<template>
    <div>
        <div>{{ t("advisor.checkingProgress") }}</div>
        <UProgress
            v-model="props.progress.checked"
            :max="props.progress.total"
            status
        />
    </div>
</template>
