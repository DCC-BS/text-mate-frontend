<script lang="ts" setup>
import type { AdvisorDocumentDescription } from "~/assets/models/advisor";
import type { AdvisorService } from "~/assets/services/AdvisorService";

const { t } = useI18n();

interface AdvisorDocSelectProps {
    advisorService: AdvisorService;
}

const props = defineProps<AdvisorDocSelectProps>();

const docs = props.advisorService.getDocs();
const selectedDocs = defineModel<AdvisorDocumentDescription[]>({
    default: [],
});
</script>

<template>
  <div class="w-full">
    <USelectMenu :items="docs" v-model="selectedDocs[0]" :filter-fields="['title', 'description', 'author', 'edition']"
      class="w-full">
      <template #default>
        <div v-if="selectedDocs.length > 0">
          {{selectedDocs.map((doc) => doc.title).join(", ")}}
        </div>
        <div v-else>
          <p class="text-gray-500">
            {{ t("advisor.selectDocs") }}
          </p>
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