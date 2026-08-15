<script setup lang="ts">
import type { SimplifyRangeKind } from "~/utils/simplifyRanges";

const props = defineProps<{
    count: number;
    converged: boolean;
    activeIndex: number;
    activeKind?: SimplifyRangeKind;
}>();

const emit = defineEmits<{
    prev: [];
    next: [];
    dismiss: [];
}>();

const { t } = useI18n();

const title = computed<string>(() =>
    t("simplify.unconverged.title", { count: props.count }, props.count),
);

const position = computed<string | undefined>(() =>
    props.activeIndex >= 0
        ? t("simplify.unconverged.position", {
              index: props.activeIndex + 1,
              count: props.count,
          })
        : undefined,
);

const reason = computed<string | undefined>(() =>
    props.activeKind === "rejected"
        ? t("simplify.unconverged.rejectedReason")
        : undefined,
);

const containerClass = computed<string>(() =>
    props.converged
        ? "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
        : "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
);

const iconName = computed<string>(() =>
    props.converged ? "i-lucide-info" : "i-lucide-triangle-alert",
);

const iconClass = computed<string>(() =>
    props.converged ? "text-blue-500" : "text-amber-500",
);
</script>

<template>
    <div
        v-if="props.count > 0"
        class="flex items-center gap-2.5 px-3 py-2 mb-2 rounded-md border text-xs shrink-0"
        :class="containerClass"
        data-testid="simplifyUnconvergedHint"
    >
        <UIcon :name="iconName" class="size-4 shrink-0" :class="iconClass" />
        <span class="font-medium text-highlighted">{{ title }}</span>
        <span v-if="position" class="text-muted">{{ position }}</span>
        <span v-if="reason" class="text-muted truncate">{{ reason }}</span>
        <div class="ml-auto flex items-center gap-1">
            <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                square
                icon="i-lucide-chevron-up"
                :aria-label="t('simplify.unconverged.prev')"
                :title="t('simplify.unconverged.prev')"
                @click="emit('prev')"
            />
            <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                square
                icon="i-lucide-chevron-down"
                :aria-label="t('simplify.unconverged.next')"
                :title="t('simplify.unconverged.next')"
                @click="emit('next')"
            />
            <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                square
                icon="i-lucide-x"
                data-testid="simplifyUnconvergedDismiss"
                :aria-label="t('simplify.unconverged.dismiss')"
                :title="t('simplify.unconverged.dismiss')"
                @click="emit('dismiss')"
            />
        </div>
    </div>
</template>
