<script lang="ts" setup>
import { type ChangeObject, diffWords } from "diff";

interface DiffViewerProps {
    originalText: string;
    correctedText: string;
}

const props = defineProps<DiffViewerProps>();
const { t } = useI18n();

const emit = defineEmits<{
    apply: [text: string];
    cancel: [];
}>();

type HunkStatus = "pending" | "accepted" | "rejected";

type Hunk = {
    index: number;
    orig: string;
    corr: string;
    diffs: ChangeObject<string>[];
    status: HunkStatus;
};

const hunks = ref<Hunk[]>([]);

const addTotal = computed(() =>
    hunks.value.reduce(
        (n, h) =>
            n +
            h.diffs
                .filter((d) => d.added)
                .reduce((m, d) => m + d.value.length, 0),
        0,
    ),
);
const delTotal = computed(() =>
    hunks.value.reduce(
        (n, h) =>
            n +
            h.diffs
                .filter((d) => d.removed)
                .reduce((m, d) => m + d.value.length, 0),
        0,
    ),
);
const resolved = computed(
    () => hunks.value.filter((h) => h.status !== "pending").length,
);
const pending = computed(() => hunks.value.length - resolved.value);

watch(
    () => [props.originalText, props.correctedText],
    () => buildHunks(),
    { immediate: true },
);

function buildHunks(): void {
    const origLines = props.originalText.split("\n");
    const corrLines = props.correctedText.split("\n");
    const length = Math.max(origLines.length, corrLines.length);
    const built: Hunk[] = [];

    for (let i = 0; i < length; i++) {
        const orig = origLines[i] ?? "";
        const corr = corrLines[i] ?? "";
        if (orig === corr) {
            continue;
        }
        built.push({
            index: i,
            orig,
            corr,
            diffs: diffWords(orig, corr),
            status: "pending",
        });
    }
    hunks.value = built;
}

function resolve(index: number, status: HunkStatus): void {
    const hunk = hunks.value.find((h) => h.index === index);
    if (hunk) {
        hunk.status = status;
    }
}

/**
 * Reconstructs the full text from the current per-hunk decisions.
 * Accepted hunks contribute the corrected text, everything else the
 * original — so rejecting = "keep original" and accept-all on apply.
 */
function buildResultText(acceptPending: boolean): string {
    const origLines = props.originalText.split("\n");
    const corrLines = props.correctedText.split("\n");
    const length = Math.max(origLines.length, corrLines.length);
    const out: string[] = [];

    for (let i = 0; i < length; i++) {
        const orig = origLines[i] ?? "";
        const corr = corrLines[i] ?? "";
        const hunk = hunks.value.find((h) => h.index === i);
        if (!hunk) {
            out.push(orig);
            continue;
        }
        if (
            hunk.status === "accepted" ||
            (acceptPending && hunk.status === "pending")
        ) {
            out.push(corr);
        } else {
            out.push(orig);
        }
    }
    return out.join("\n");
}

function applyAll(): void {
    emit("apply", buildResultText(true));
}

function cancel(): void {
    emit("cancel");
}
</script>

<template>
    <div class="h-full flex flex-col">
        <header
            class="flex items-center justify-between px-4 py-3 border-b border-default shrink-0"
        >
            <div class="flex items-center gap-2">
                <h2 class="text-sm font-semibold text-toned">
                    {{ t("advisor.reviewChanges") }}
                </h2>
                <span class="text-xs text-muted flex gap-2">
                    <span class="text-secondary font-semibold"
                        >+{{ addTotal }}</span
                    >
                    <span class="text-primary font-semibold"
                        >−{{ delTotal }}</span
                    >
                </span>
            </div>
            <UButton
                icon="i-lucide-x"
                size="xs"
                variant="ghost"
                color="neutral"
                :label="t('common.cancel')"
                @click="cancel"
            />
        </header>

        <div class="flex-1 overflow-y-auto p-4">
            <div class="max-w-3xl mx-auto space-y-3">
                <template v-for="hunk in hunks" :key="hunk.index">
                    <div
                        class="rounded-lg border overflow-hidden transition-colors"
                        :class="
                            hunk.status === 'accepted'
                                ? 'border-secondary/40'
                                : hunk.status === 'rejected'
                                  ? 'opacity-40'
                                  : 'border-default'
                        "
                    >
                        <div class="p-3 text-[15px] leading-relaxed">
                            <template
                                v-for="(token, ti) in hunk.diffs"
                                :key="ti"
                            >
                                <span
                                    v-if="token.added"
                                    class="advisor-diff-add"
                                    >{{ token.value }}</span
                                >
                                <span
                                    v-else-if="token.removed"
                                    class="advisor-diff-del"
                                    >{{ token.value }}</span
                                >
                                <span v-else>{{ token.value }}</span>
                            </template>
                        </div>
                        <div
                            class="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-t border-default"
                        >
                            <span class="text-[11px] text-muted font-medium">
                                ¶{{ hunk.index + 1 }}
                            </span>
                            <div
                                v-if="hunk.status === 'pending'"
                                class="flex gap-1"
                            >
                                <UButton
                                    icon="i-lucide-check"
                                    size="xs"
                                    color="secondary"
                                    :label="t('common.accept')"
                                    @click="resolve(hunk.index, 'accepted')"
                                />
                                <UButton
                                    icon="i-lucide-x"
                                    size="xs"
                                    variant="soft"
                                    color="neutral"
                                    :label="t('common.reject')"
                                    @click="resolve(hunk.index, 'rejected')"
                                />
                            </div>
                            <span
                                v-else
                                class="flex items-center gap-1 text-[11px] font-medium"
                                :class="
                                    hunk.status === 'accepted'
                                        ? 'text-secondary'
                                        : 'text-muted'
                                "
                            >
                                <UIcon
                                    :name="
                                        hunk.status === 'accepted'
                                            ? 'i-lucide-check-circle'
                                            : 'i-lucide-circle-slash'
                                    "
                                    class="text-sm"
                                />
                                {{ hunk.status === "accepted"
                                        ? t("advisor.accepted")
                                        : t("advisor.rejected") }}
                            </span>
                        </div>
                    </div>
                </template>
                <div
                    v-if="!hunks.length"
                    class="text-center text-muted py-10 text-sm"
                >
                    {{ t("advisor.noChanges") }}
                </div>
            </div>
        </div>

        <footer
            class="flex items-center justify-between px-4 py-2 border-t border-default shrink-0"
        >
            <span class="text-xs text-muted">
                {{ t("advisor.diffProgress", { resolved: resolved, total: hunks.length }) }}
            </span>
            <UButton
                color="primary"
                icon="i-lucide-check"
                :label="
                    pending > 0
                        ? t('advisor.acceptRemaining', { n: pending })
                        : t('advisor.applyChanges')
                "
                :disabled="!hunks.length"
                @click="applyAll"
            />
        </footer>
    </div>
</template>
