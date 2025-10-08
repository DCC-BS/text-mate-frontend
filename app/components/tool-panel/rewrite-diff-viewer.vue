<script lang="ts" setup>
import { diffWords, type ChangeObject } from 'diff';
import { Cmds, type ApplyTextAction } from '~/assets/models/commands';

interface Props {
    text: string;
}

const props = defineProps<Props>();

const { onCommand } = useCommandBus();

const commandHistory = ref<ApplyTextAction[]>([]);

const changes = computed<ChangeObject<string>[]>(() => {
    if (commandHistory.value.length === 0) {
        return [
            {
                value: props.text,
                added: false,
                removed: false,
                count: props.text.length,
            }
        ]
    }

    const lastCommand = commandHistory.value[commandHistory.value.length - 1];
    if (!lastCommand) {
        return [
            {
                value: props.text,
                added: false,
                removed: false,
                count: props.text.length,
            }
        ]
    }
    return diffWords(props.text, lastCommand.newText);
});

onCommand<ApplyTextAction>(Cmds.ApplyTextAction, async (cmd) => {
    commandHistory.value.push(cmd);
});
</script>

<template>
    <div>
        <div v-for="change in changes" :key="change.value">
            <span v-if="change.added" class="text-green-400">{{ change.value }}</span>
            <span v-if="change.removed" class="text-red-400">{{ change.value }}</span>
            <span v-if="!change.added && !change.removed">{{ change.value }}</span>
        </div>
    </div>
</template>