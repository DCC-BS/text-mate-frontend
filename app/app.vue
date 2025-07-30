<script setup lang="ts">
const { $pwa } = useNuxtApp();

const { t } = useI18n();
</script>

<template>
    <div v-show="$pwa?.needRefresh" class="p-2">
        <UAlert
            :title="t('pwa.newContentAvailable')"
            :description="t('pwa.newVersionDescription')"
            color="info"
            icon="i-lucide-cloud-download"
            >
            <template #actions>
                <UButton @click="$pwa?.updateServiceWorker()">
                    {{ t('pwa.refresh') }}
                </UButton>
            </template>
         </UAlert>
    </div>

    <NuxtPwaManifest />
    <Disclaimer app-name="TextMate" />
    <UApp>
        <NuxtPage />
    </UApp>
</template>
