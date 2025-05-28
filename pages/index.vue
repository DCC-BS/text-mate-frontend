<script lang="ts" setup>
import type { IReport } from "~/models/report";
import { UButton, UIcon } from "#components";

/**
 * Reactive references for component state
 */
const { getAllReports, createReport, removeReport } = useReportService();
const { t } = useI18n();
const isCreatingReport = ref(false);
const reports = ref<IReport[]>([]);

/**
 * Check if the device is mobile
 */
const isMobile = ref(false);

/**
 * Update mobile state based on screen size
 */
function updateMobileState(): void {
    isMobile.value = window?.innerWidth < 768;
}

onMounted(() => {
    // Fetch all reports
    getAllReports()
        .then((data) => {
            reports.value = data;
        })
        .catch((error) => {
            console.error("Error fetching reports:", error);
        });

    // Set initial mobile state
    updateMobileState();

    // Add event listener for resize
    window?.addEventListener("resize", updateMobileState);
});

onUnmounted(() => {
    // Clean up event listener
    window?.removeEventListener("resize", updateMobileState);
});

async function createNewReport(): Promise<void> {
    if (isCreatingReport.value) {
        return;
    }

    isCreatingReport.value = true;
    const report = await createReport("new Report");
    navigateTo(`/notes/${report.id}`);
    isCreatingReport.value = false;
}

function openReport(id: string): void {
    navigateTo(`/notes/${id}`);
}

async function deleteReport(id: string): Promise<void> {
    await removeReport(id);
    reports.value = reports.value.filter((report) => report.id !== id);
}
</script>

<template>
    <!-- Responsive container with adjusted padding for mobile -->
    <UContainer :class="['w-full', isMobile ? 'mt-4 px-2' : 'mt-20']">
        <div v-if="!isCreatingReport" class="w-full">
            <!-- Reports table component -->
            <ReportsTable :reports="reports" @view-report="openReport" @delete-report="deleteReport" />
        </div>

        <!-- Loading state with centered spinner -->
        <div v-else class="flex flex-col items-center justify-center min-h-[50vh]">
            <UIcon name="i-lucide-refresh-ccw" class="w-10 h-10 animate-spin text-primary" />
            <p class="mt-4 text-gray-600">{{ t('home.creatingReport') }}</p>
        </div>

        <div class="z-200 fixed bottom-0 right-0 m-4 flex flex-col-reverse items-end gap-2 justify-end">
            <UButton variant="solid" color="primary" size="xl" trailing-icon="i-lucide-plus"
                class="rounded-full add-button" @click="createNewReport">
                {{ t('home.createNewReport') }}
            </UButton>
        </div>

    </UContainer>
</template>

<style scoped>
/* Mobile-first responsive styles */
@media (max-width: 767px) {
    :deep(.u-container) {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
    }
}
</style>
