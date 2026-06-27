<script setup lang="ts">
const text = defineModel({ default: "" });
</script>

<template>
    <div class="p-2 h-full w-full flex-1">
        <AdvisorEditor v-model="text" />
    </div>
</template>
