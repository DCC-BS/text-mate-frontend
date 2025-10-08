<script lang="ts" setup>
import { type ChangeObject, diffWords } from "diff";
import { type RegisterDiffCommand, Cmds } from "~/assets/models/commands";

interface Props {
    text: string;
}

const props = defineProps<Props>();

const { onCommand } = useCommandBus();

const commandHistory = ref<RegisterDiffCommand[]>([]);

const changes = computed<ChangeObject<string>[]>(() => {
    if (commandHistory.value.length === 0) {
        return [
            {
                value: props.text,
                added: false,
                removed: false,
                count: props.text.length,
            },
        ];
    }

    const lastCommand = commandHistory.value[commandHistory.value.length - 1];

    console.log("Last command:", lastCommand);

    if (!lastCommand) {
        return [
            {
                value: props.text,
                added: false,
                removed: false,
                count: props.text.length,
            },
        ];
    }
    return diffWords(lastCommand.newText, props.text);
});

onCommand<RegisterDiffCommand>(Cmds.RegisterDiffCommand, async (cmd) => {
    commandHistory.value.push(cmd);
});
</script>

<template>
    <div class="overflow-auto absolute inset-0 p-1 ProseMirror dark">
        <template v-for="change in changes" :key="change.value">
            <UPopover mode="hover">
                <span v-if="change.added"
                    class="underline text-wrap decoration-2 decoration-green-400 hover:decoration-primary cursor-pointer">{{
                        change.value
                    }}</span>
                <template #content>
                    <UButton>Undo</UButton>
                </template>
            </UPopover>
            <UPopover mode="hover">
                <span v-if="change.removed"
                    class="underline text-wrap decoration-red-400 hover:decoration-primary cursor-pointer">{{
                        change.value
                    }}</span>
                <template #content>
                    <UButton>Undo</UButton>
                </template>
            </UPopover>
            <span class="text-wrap" v-if="!change.added && !change.removed">{{ change.value }}</span>
        </template>
    </div>
</template>