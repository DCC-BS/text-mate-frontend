<script setup lang="ts">
import type { AdvisorDocumentDescription } from "#shared/types/advisor";
import type { AdvisorThreadResult } from "~/assets/models/advisor";
import ThreadCard from "./ThreadCard.vue";

const { t } = useI18n();
const { validate } = useAdvisor();
const toast = useToast();

const text = defineModel({ default: "" });
const selectedDocs = ref<AdvisorDocumentDescription[]>([]);

const phase = ref<"edit" | "reviewing" | "review" | "fixing" | "audit">("edit");

const threadResults = ref([
    {
        checked: 0,
        total: 1,
        threads: [],
    },
] as AdvisorThreadResult[]);

async function onCheck() {
    phase.value = "reviewing";

    try {
        const results = validate(
            text.value,
            selectedDocs.value.map((x) => x.id),
        );

        for await (const result of results) {
            threadResults.value.push(result);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        phase.value = "review";
    } catch (error: unknown) {
        console.error("Advisor validation failed:", error);
        const message = error instanceof Error ? error.message : String(error);
        toast.add({
            title: t("advisor.checkFailed"),
            description: message,
            color: "error",
            icon: "i-lucide-alert-circle",
            duration: 5000,
        });
        phase.value = "edit";
    }
}
</script>

<template>
    <div class="p-2 h-full w-full flex-1 flex">
        <div class="flex-1 p-2"><AdvisorEditor v-model="text" /></div>

        <div class="flex-1 p-2">
            <div v-if="phase === 'edit'">
                <AdvisorDocSelect v-model="selectedDocs" />

                <UButton variant="ghost" @click="onCheck"
                    >{{ t("advisor.check") }}</UButton
                >
            </div>

            <div v-if="phase === 'reviewing'">
                <AdvisorValidationProgress
                    :progress="threadResults.at(-1) as AdvisorThreadResult"
                />
            </div>

            <div v-if="phase === 'reviewing' || phase === 'review'">
                <div v-for="thread in threadResults.flatMap((x) => x.threads)">
                    <ThreadCard :thread="thread" />
                </div>
            </div>
        </div>
    </div>
</template>
