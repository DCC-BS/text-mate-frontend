<template>
  <div class="absolute top-2 right-2 flex items-center gap-2">
    <UTooltip :text="t('navigation.clearText')">
      <UButton icon="i-lucide-x" variant="link" color="neutral" size="sm" @click="handleClearText"
        data-testid="clear-text-button" />
    </UTooltip>
  </div>
</template>

<script lang="ts" setup>
import { ClearTextCommand } from "~/assets/models/commands";

const { executeCommand } = useCommandBus();
const { t } = useI18n();

function handleClearText(): void {
  executeCommand(new ClearTextCommand());
}
</script>
