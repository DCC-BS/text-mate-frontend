<script setup lang="ts">
import type { MobileAction } from "~/composables/useMobileActions";
import type { RibbonTransformProps } from "~/types/ribbon";

/**
 * Mobile transform ribbon. Two promoted actions render as vertical pills
 * (icon over label); a "more" pill opens a bottom drawer that lists every
 * remaining action grouped by section (a settings-list style).
 */
const props = defineProps<RibbonTransformProps>();
const { t } = useI18n();
const { actionsAreAvailable, apply, groups } = useMobileActions(props);

const moreOpen = ref(false);

// The two actions promoted to the inline row.
const inlineIds = ["summarize", "proofread"] as const;

const inlineActions = computed(() => {
    const all = groups.value.flatMap((g) => g.actions);
    return inlineIds
        .map((id) => all.find((a) => a.id === id))
        .filter((a): a is MobileAction => a !== undefined);
});

// Everything except the two promoted actions, grouped for the "more" drawer.
const drawerGroups = computed(() =>
    groups.value
        .map((g) => ({
            ...g,
            actions: g.actions.filter(
                (a) => !inlineIds.includes(a.id as (typeof inlineIds)[number]),
            ),
        }))
        .filter((g) => g.actions.length > 0),
);

function runSimple(action: MobileAction): void {
    if (action.kind === "simple") {
        apply(action.action, action.config);
    }
}

/** Runs a drawer action and dismisses the "more" drawer afterwards. */
function runDrawerSimple(action: MobileAction): void {
    moreOpen.value = false;
    runSimple(action);
}

function onDrawerSelect(actionId: string, config: string): void {
    moreOpen.value = false;
    apply(actionId, config);
}

function onDrawerCustom(config: string): void {
    moreOpen.value = false;
    apply("custom", config);
}
</script>

<template>
    <div class="flex items-stretch gap-2 w-full min-w-0 md:hidden">
        <!-- Promoted vertical-pill primaries -->
        <template v-for="action in inlineActions" :key="action.id">
            <RibbonOptionSheet
                v-if="action.kind === 'options'"
                :label="action.label"
                :options="action.options"
                :disabled="!actionsAreAvailable"
                @select="apply(action.id, $event)"
            >
                <UButton
                    variant="soft"
                    color="neutral"
                    class="flex-col h-auto py-2.5 gap-1 flex-1 min-w-0 rounded-xl"
                    :disabled="!actionsAreAvailable"
                >
                    <UIcon :name="action.icon" class="size-6" />
                    <span
                        class="text-xs font-medium truncate w-full text-center"
                        >{{ action.label }}</span
                    >
                </UButton>
            </RibbonOptionSheet>

            <UButton
                v-else
                variant="soft"
                color="neutral"
                class="flex-col h-auto py-2.5 gap-1 flex-1 min-w-0 rounded-xl"
                :disabled="!actionsAreAvailable"
                @click="runSimple(action)"
            >
                <UIcon :name="action.icon" class="size-6" />
                <span class="text-xs font-medium truncate w-full text-center"
                    >{{ action.label }}</span
                >
            </UButton>
        </template>

        <!-- More -->
        <UDrawer v-model:open="moreOpen" :title="t('actions.more')">
            <UButton
                variant="outline"
                color="neutral"
                class="flex-col h-auto py-2.5 gap-1 px-4 shrink-0 rounded-xl"
                :disabled="!actionsAreAvailable"
                data-tour="custom-quick-action-mobile"
            >
                <UIcon name="i-lucide-layout-grid" class="size-6" />
                <span class="text-xs font-medium">{{ t("actions.more") }}</span>
            </UButton>

            <template #content>
                <div
                    class="pb-8 max-h-[70vh] overflow-y-auto divide-y divide-default"
                >
                    <div v-for="group in drawerGroups" :key="group.id">
                        <div
                            class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted bg-muted/40 sticky top-0"
                        >
                            <UIcon
                                v-if="group.icon"
                                :name="group.icon"
                                class="size-3.5"
                            />
                            <span>{{ group.label }}</span>
                        </div>

                        <template
                            v-for="action in group.actions"
                            :key="action.id"
                        >
                            <RibbonOptionSheet
                                v-if="action.kind === 'options'"
                                :label="action.label"
                                :options="action.options"
                                :disabled="!actionsAreAvailable"
                                nested
                                @select="onDrawerSelect(action.id, $event)"
                            >
                                <div
                                    class="flex items-center gap-3 px-3 py-3.5 active:bg-elevated/50 transition cursor-pointer"
                                >
                                    <UIcon
                                        :name="action.icon"
                                        class="size-5 shrink-0"
                                    />
                                    <span class="flex-1 text-sm"
                                        >{{ action.label }}</span
                                    >
                                    <UIcon
                                        name="i-lucide-chevron-right"
                                        class="size-4 text-muted"
                                    />
                                </div>
                            </RibbonOptionSheet>

                            <RibbonCustomSheet
                                v-else-if="action.kind === 'custom'"
                                :disabled="!actionsAreAvailable"
                                nested
                                @submit="onDrawerCustom($event)"
                            >
                                <div
                                    class="flex items-center gap-3 px-3 py-3.5 active:bg-elevated/50 transition cursor-pointer"
                                >
                                    <UIcon
                                        :name="action.icon"
                                        class="size-5 shrink-0"
                                    />
                                    <span class="flex-1 text-sm"
                                        >{{ action.label }}</span
                                    >
                                    <UIcon
                                        name="i-lucide-chevron-right"
                                        class="size-4 text-muted"
                                    />
                                </div>
                            </RibbonCustomSheet>

                            <button
                                v-else
                                type="button"
                                :disabled="!actionsAreAvailable"
                                class="flex items-center gap-3 w-full px-3 py-3.5 text-left active:bg-elevated/50 transition disabled:opacity-50"
                                @click="runDrawerSimple(action)"
                            >
                                <UIcon
                                    :name="action.icon"
                                    class="size-5 shrink-0"
                                />
                                <span class="flex-1 text-sm"
                                    >{{ action.label }}</span
                                >
                            </button>
                        </template>
                    </div>
                </div>
            </template>
        </UDrawer>
    </div>
</template>
