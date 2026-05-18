<script lang="ts" setup>
import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type { DropdownMenuItem } from "@nuxt/ui";
import { z } from "zod";
import {
    type TextActionGetOutput,
    TextActionGetOutputSchema,
} from "~~/shared/text-actions";

interface InputProps {
    actionsAreAvailable: boolean;
}

const props = defineProps<InputProps>();

const emit = defineEmits<(e: "apply-action", action: string) => void>();

const { t } = useI18n();
const { showError } = useUserFeedback();

const userActions = ref<TextActionGetOutput[]>([]);

onMounted(async () => {
    const response = await apiFetch("/api/user-actions", {
        method: "get",
        schema: z.array(TextActionGetOutputSchema),
    });

    if (isApiError(response)) {
        showError(response);
    } else {
        userActions.value = response;
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
