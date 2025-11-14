<script lang="ts" setup>
import { type ChangeObject, diffWords } from "diff";
import {
    ApplyTextCommand,
    Cmds,
    type RegisterDiffCommand,
} from "~/assets/models/commands";

interface Props {
    text: string;
}

type ActionChange = {
    diffs: ChangeObject<string>[];
    hasChanged: boolean;
    from: number;
    to: number;
    addedText: string;
    removedText: string;
    oldText: string;
};

const props = defineProps<Props>();

const { onCommand, executeCommand } = useCommandBus();

const commandHistory = ref<RegisterDiffCommand[]>([]);

/**
 * Filters a string to replace sequences of more than one newline with a single newline.
 * @param text The input string to filter.
 * @returns The filtered string.
 */
function filterExtraNewlines(text: string): string {
    return text.replace(/\n{3,}/g, "\n");
}

const changes = computed<ActionChange[]>(() => {
    if (commandHistory.value.length === 0) {
        return [] as ActionChange[];
    }

    const lastCommand = commandHistory.value[commandHistory.value.length - 1];

    if (!lastCommand) {
        return [];
    }

    const diffs = diffWords(lastCommand.newText, props.text);
    const changes = [] as ActionChange[];
    let currentPos = 0;

    for (let i = 0; i < diffs.length; i++) {
        const current = diffs[i] as ChangeObject<string>;
        const next = diffs[i + 1] as ChangeObject<string> | undefined;

        if (current.removed && next?.added) {
            changes.push({
                diffs: [next, current],
                from: currentPos,
                hasChanged: true,
                to: currentPos + next.value.length,
                addedText: next.value,
                removedText: current.value,
                oldText: filterExtraNewlines(current.value),
            });

            i++; // Skip the next one as it's already processed

            currentPos += next.value.length;
            continue;
        }

        changes.push({
            diffs: [current],
            from: currentPos,
            hasChanged: current.added || current.removed,
            to: current.removed ? currentPos : currentPos + current.value.length,
            addedText: current?.added ? filterExtraNewlines(current.value) : "",
            removedText: current?.removed
                ? filterExtraNewlines(current.value)
                : "",
            oldText: current.added ? "" : filterExtraNewlines(current.value),
        });

        if (!current.removed) {
            currentPos += current.value.length;
        }
    }

    return changes;
});

function undo(change: ActionChange): void {
    executeCommand(
        new ApplyTextCommand(change.oldText, {
            from: change.from,
            to: change.to,
        }),
    );
}

onCommand<RegisterDiffCommand>(Cmds.RegisterDiffCommand, async (cmd) => {
    commandHistory.value.push(cmd);
});

function applyAllChanges() {
    commandHistory.value = [];
}

async function undoAllChanges() {
    for (const change of changes.value) {
        if (change.hasChanged) {
            await executeCommand(
                new ApplyTextCommand(change.oldText, {
                    from: change.from,
                    to: change.to,
                }),
            );
        }
    }

    commandHistory.value = [];
}
</script>

<template>
    <div class="absolute -bottom-2 -inset-x-2 z-10">
        <div class="flex justify-between">
            <div v-if="changes.length" data-tour="rewrite-toolpanel">
                <UButton variant="link" color="neutral" icon="i-lucide-check" @click="applyAllChanges" />
                <UButton variant="link" color="neutral" icon="i-lucide-x" @click="undoAllChanges" />
            </div>
        </div>
    </div>

    <div class="overflow-y-auto absolute inset-0 p-1  dark">
        <div>
            <template v-for="change in changes" :key="`${change.from}${change.oldText}`">
                <UPopover v-if="change.hasChanged">
                    <span class="group cursor-pointer hover:bg-info-300 inline-block align-top">
                        <pre class="bg-red-100 group-hover:bg-red-200 inline text-wrap">{{ change.removedText }}</pre>
                        <UIcon name="i-lucide-arrow-right" class="mx-2"
                            v-if="change.removedText.length > 0 && change.addedText.length > 0" />
                        <pre class="bg-green-100 group-hover:bg-green-200 inline text-wrap">{{ change.addedText }}</pre>
                    </span>
                    <template #content>
                        <div class="p-2 ring-1 ring-gray-400 rounded-md">
                            <UButton variant="link" color="neutral" icon="i-lucide-undo" @click="undo(change)">
                                {{
                                    $t('rewrite-diff-viewer.undo') }}
                            </UButton>
                        </div>
                    </template>
                </UPopover>
                <span v-else class="text-wrap">{{change.diffs.map(x => x.value).join('')}}</span>
            </template>
            <div v-if="!changes.length" class="text-gray-600 text-center mt-5">
                {{ $t('rewrite-diff-viewer.noChangesYet') }}
            </div>
        </div>
    </div>
</template>
