<script lang="ts" setup>
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
        onSelect: () => emit("apply-action", x.id),
    })),
);
</script>

<template>
    <UDropdownMenu :items="items" v-if="items.length > 0">
        <UButton variant="link" :disabled="!props.actionsAreAvailable">
            {{ t("editor.userActions") }}
        </UButton>
    </UDropdownMenu>
</template>
