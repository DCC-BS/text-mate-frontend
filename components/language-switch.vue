<script lang="ts" setup>
const switchLocalePath = useSwitchLocalePath()
</script>

<template>
    <NuxtLink :to="switchLocalePath('en')">English</NuxtLink>
    <NuxtLink :to="switchLocalePath('de')">Deutsch</NuxtLink>
</template>
