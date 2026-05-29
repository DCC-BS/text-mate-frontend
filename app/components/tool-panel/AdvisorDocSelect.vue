<script lang="ts" setup>
import { computed } from "vue";
import type { AdvisorDocumentDescription } from "~/assets/models/advisor";
import type { AdvisorService } from "~/assets/services/AdvisorService";

const { t } = useI18n();
const toast = useToast();

interface AdvisorDocSelectProps {
    advisorService: AdvisorService;
}

const props = defineProps<AdvisorDocSelectProps>();

const docs = props.advisorService.getDocs();
const selectedDocs = defineModel<AdvisorDocumentDescription[]>({
    default: [],
});

const selectedDocsModel = computed({
    get: () => selectedDocs.value,
    set: (value: AdvisorDocumentDescription[]) => {
        if (value.length > 5) {
            toast.add({
                title: t("advisor.limitReached") || "Limit reached",
                description:
                    t("advisor.limitDescription") ||
                    "You can select up to 5 documents.",
                color: "warning",
            });
            selectedDocs.value = value.slice(0, 5);
        } else {
            selectedDocs.value = value;
        }
    },
});
</script>

<template>
    <div class="w-full">
        <USelectMenu
            multiple
            :items="docs"
            v-model="selectedDocsModel"
            :filter-fields="['title', 'description', 'author', 'edition']"
            class="w-full"
        >
            <template #default>
                <div v-if="selectedDocs.length > 0">
                    {{ selectedDocs.map((doc) => doc.title).join(", ") }}
                </div>
                <div v-else>
                    <p class="text-gray-500">{{ t("advisor.selectDocs") }}</p>
                </div>
            </template>
            <template #item-label="{ item }">
                <div class="flex flex-col">
                    <p class="text-md font-bold">{{ item.title }}</p>
                    <p>{{ item.description }}</p>
                    <p>{{ item.author }}</p>
                    <p>{{ item.edition }}</p>
                </div>
            </template>
        </USelectMenu>
    </div>
</template>

<style></style>
