<script lang="ts" setup>
interface ComparePanelProps {
    text: string;
}

const props = defineProps<ComparePanelProps>();

const oldText = ref<string>("");
const currentText = ref<string>("");

watch(
    () => props.text,
    (newValue) => {
        if (newValue !== currentText.value) {
            oldText.value = currentText.value;
            currentText.value = newValue;
        }
    },
);
</script>

<template>
  <div v-if="oldText">
    <UTextarea v-model="oldText" :placeholder="$t('text-editor.compare.oldText')" class="mb-4" />
  </div>
</template>


<style>

</style>