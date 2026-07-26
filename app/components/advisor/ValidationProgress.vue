<script setup lang="ts">
import type { ValidationProgress } from "~/assets/models/advisor";

interface InputProps {
    progress: ValidationProgress;
}

const props = defineProps<InputProps>();

const current = computed(() => props.progress.checked ?? 0);

const { t } = useI18n();
</script>

<template>
    <div>
        <UProgress
            v-model:model-value="current"
            :max="props.progress.total ?? 1"
            status
        >
            <template #status>
                <div>
                    {{ t("advisor.checkingProgress") }}
                    {{ `${props.progress.checked}/${props.progress.total}` }}
                </div>
            </template>
        </UProgress>
    </div>
</template>
