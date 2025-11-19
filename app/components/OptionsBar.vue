<script lang="ts" setup>
import { UButton } from "#components";
</script>

<template>
  <div>
    <div class="hidden md:flex gap-2">
      <tool-panel-language-select />
      <tool-panel-user-dictionary />
    </div>
    <div class="md:hidden flex justify-end">
      <UPopover>
        <UButton variant="link" color="neutral" icon="i-lucide-ellipsis"></UButton>
        <template #content>
          <div class="p-2 flex flex-col gap-2">
            <tool-panel-language-select />
            <tool-panel-user-dictionary />
          </div>
        </template>
      </UPopover>
    </div>
  </div>
</template>