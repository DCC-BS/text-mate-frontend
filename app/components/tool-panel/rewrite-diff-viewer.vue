<script lang="ts" setup>
import { type ChangeObject, diffWords } from "diff";
import { ApplyTextCommand, Cmds, type RegisterDiffCommand } from "~/assets/models/commands";

interface Props {
    text: string;
}

type ActionChange = {
    diffs: ChangeObject<string>[];
    hasChanged: boolean;
    from: number;
    to: number;
    oldText: string;
}

const props = defineProps<Props>();

const { onCommand, executeCommand } = useCommandBus();

const commandHistory = ref<RegisterDiffCommand[]>([]);

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
        const next = diffs[i + 1] as ChangeObject<string>;

        if (current.removed && next.added) {
            changes.push({
                diffs: [next, current],
                from: currentPos,
                hasChanged: true,
                to: currentPos + next.value.length,
                oldText: current.value,
            });

            i++; // Skip the next one as it's already processed

            currentPos += next.value.length + 1;
            continue;
        }

        changes.push({
            diffs: [current],
            from: currentPos,
            hasChanged: current.added || current.removed,
            to: currentPos + current.value.length,
            oldText: current?.added ? "" : current.value,
        });

        if (!current.removed) {
            currentPos += current.value.length + 1;
        }
    }

    console.log("Computed changes:", changes);
    return changes;
});

function undo(change: ActionChange): void {
    executeCommand(new ApplyTextCommand(change.oldText, { from: change.from, to: change.to }));
}

onCommand<RegisterDiffCommand>(Cmds.RegisterDiffCommand, async (cmd) => {
    commandHistory.value.push(cmd);
});
</script>

<template>
    <div class="overflow-auto absolute inset-0 p-1 ProseMirror dark">
        <div>
            <!-- <h3 v-if="changes.length">{{ $t('rewrite-diff-viewer.changes') }}
                <span class="text-sm text-gray-500"> {{ $t('rewrite-diff-viewer.clickToUndo') }}</span>
            </h3> -->
            <template v-for="change in changes" :key="change.from">
                <UPopover v-if="change.hasChanged">
                    <span class="cursor-pointer hover:bg-info-50">
                        <span v-for="diff in change.diffs" class="underline text-wrap decoration-2"
                            :class="{ 'decoration-red-400': diff.removed, 'decoration-green-400': diff.added }">
                            {{ diff.value }}
                        </span>
                    </span>
                    <template #content>
                        <div class="p-2 ring-1 ring-gray-400 rounded-md">
                            <span class="bg-red-50">{{change.diffs.filter(x => x.removed).map(x =>
                                x.value).join('')}}</span>
                            <UIcon name="i-lucide-arrow-right" class="mx-2" />
                            <span class="bg-green-50">{{change.diffs.filter(x => x.added).map(x =>
                                x.value).join('')}}</span>
                            <br />
                            <UButton variant="link" color="neutral" icon="i-lucide-undo" @click="undo(change)">{{
                                $t('rewrite-diff-viewer.undo') }}
                            </UButton>
                        </div>
                    </template>
                </UPopover>
                <span v-else class="text-wrap">{{change.diffs.map(x => x.value).join('')}}</span>
            </template>
        </div>
    </div>
</template>
