<script lang="ts" setup>
import { tooltip } from "#build/ui";
import { UButton, UTooltip } from "#components";
import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type { DropdownMenuItem } from "@nuxt/ui";
import {
    type TextAction,
    TextActionGetOutputSchema,
} from "~~/shared/text-actions";

interface InputProps {
    actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit = defineEmits<(e: "apply-action", action: string) => void>();

const { t } = useI18n();
const { showError } = useUserFeedback();
const logger = useLogger();

const userActions = ref<TextAction[]>([]);

onMounted(async () => {
    const response = await apiFetch("/api/user-actions", {
        method: "get",
        schema: TextActionGetOutputSchema,
    });

    console.log(response);

    if (isApiError(response)) {
        logger.error(response, "Failed to load user actions");
        showError(response);
    } else {
        userActions.value = response.actions;
    }
});

const items = computed<DropdownMenuItem[]>(() =>
    userActions.value.map((x) => ({
        label: x.name,
        value: x.id,
        tooltip: x.tooltip,
        onSelect: () => emit("apply-action", x.id),
    } satisfies DropdownMenuItem)),
);
</script>

<template>
    <UDropdownMenu :items="items" v-if="items.length > 0">
            <UButton
                variant="link"
                color="neutral"
                size="sm"
                :disabled="!props.actionsAreAvailable"
            >
                {{ t("editor.userActions") }}
            </UButton>
        <template #item="{ item }">
            <UTooltip :text="item.tooltip">
                <UButton class="p-0" variant="link" color="neutral"  @click="item.onSelect">
                    {{ item.label }}
                </UButton>
            </UTooltip>
        </template>
    </UDropdownMenu>
</template>
