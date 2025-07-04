<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { diffWords } from "diff";
import { UButton, USwitch } from "#components";
import {
    CompleteRequestChangeCommand,
    RequestChangesCommand,
} from "~/assets/models/commands";

const props = defineProps({
    ...nodeViewProps,
});

const { executeCommand } = useCommandBus();
// Get access to translations
const { t } = useI18n();
const showChanges = ref(true);

const command = computed(() => {
    return new RequestChangesCommand(
        props.node.attrs.oldText,
        props.node.attrs.newText,
        props.node.attrs.from,
        props.node.attrs.to,
    );
});

const changes = computed(() => {
    const oldText = command.value.oldText;
    const newText = command.value.newText;

    if (showChanges.value === false) {
        return command.value.oldText;
    }

    const changes = diffWords(oldText, newText);
    let text = "";

    for (const change of changes) {
        if (change.added) {
            text += `<span class="text-added">${change.value}</span>`;
        } else if (change.removed) {
            text += `<span class="text-removed">${change.value}</span>`;
        } else {
            text += change.value;
        }
    }

    return text;
});

async function applyChanges() {
    await executeCommand(
        new CompleteRequestChangeCommand(command.value, "accept"),
    );
}

async function rejectChanges() {
    await executeCommand(
        new CompleteRequestChangeCommand(command.value, "reject"),
    );
}
</script>

<template>
    <node-view-wrapper class="text-apply" contenteditable="false">
        <div class="flex justify-end mt-2 gap-1 items-center">
                <USwitch v-model="showChanges" size="sm" color="primary" :label="t('text-editor.show-changes')">
                </USwitch>
                <div class="grow"></div>

                <UButton size="sm" color="success" @click="applyChanges">{{ t('text-editor.apply-changes') }}</UButton>
                <UButton size="sm" class="ml-2" color="neutral" @click="rejectChanges">{{ t('text-editor.revert-changes') }}</UButton>
            </div>
        <div class="m-2 p-1 border-2 border-gray-300 rounded-md">
            <div class="font-bold text-lg">{{ t('text-editor.original') }}</div>
            <span v-html="changes"></span>
        </div>
    </node-view-wrapper>
</template>