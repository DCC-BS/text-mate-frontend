<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { safeWordLink } from "~/utils/wordExportLinks";

const props = defineProps<{ editor: Editor; disabled: boolean }>();
const { t } = useI18n();
const revision = ref(0);
const link = ref("");
const linkOpen = ref(false);
// Tiptap state is not Vue-reactive; selection and formatting both trigger refreshes.
function refresh(): void {
    revision.value++;
}
onMounted(function subscribe(): void {
    props.editor.on("transaction", refresh);
});
onBeforeUnmount(function unsubscribe(): void {
    props.editor.off("transaction", refresh);
});
const current = computed(function currentFormatting() {
    void revision.value;
    const attrs = props.editor.getAttributes("textStyle");
    return {
        font: typeof attrs.fontFamily === "string" ? attrs.fontFamily : "",
        size:
            typeof attrs.fontSize === "string"
                ? Number.parseFloat(attrs.fontSize)
                : "",
        heading: props.editor.isActive("heading")
            ? String(props.editor.getAttributes("heading").level)
            : "0",
    };
});
const actions = [
    "bold",
    "italic",
    "underline",
    "strike",
    "bulletList",
    "orderedList",
] as const;
type Action = (typeof actions)[number];
const icons: Record<Action, string> = {
    bold: "i-lucide-bold",
    italic: "i-lucide-italic",
    underline: "i-lucide-underline",
    strike: "i-lucide-strikethrough",
    bulletList: "i-lucide-list",
    orderedList: "i-lucide-list-ordered",
};
function active(action: Action): boolean {
    void revision.value;
    return props.editor.isActive(action);
}
function toggle(action: Action): void {
    const chain = props.editor.chain().focus();
    switch (action) {
        case "bold":
            chain.toggleBold().run();
            break;
        case "italic":
            chain.toggleItalic().run();
            break;
        case "underline":
            chain.toggleUnderline().run();
            break;
        case "strike":
            chain.toggleStrike().run();
            break;
        case "bulletList":
            chain.toggleBulletList().run();
            break;
        case "orderedList":
            chain.toggleOrderedList().run();
            break;
    }
}
function changeFont(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    if (value) props.editor.chain().focus().setFontFamily(value).run();
    else props.editor.chain().focus().unsetFontFamily().run();
}
function changeSize(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) props.editor.chain().focus().unsetFontSize().run();
    else if (Number(value) >= 6 && Number(value) <= 72)
        props.editor.chain().focus().setFontSize(`${value}pt`).run();
}
function changeHeading(event: Event): void {
    const level = Number((event.target as HTMLSelectElement).value);
    if (level === 1 || level === 2 || level === 3)
        props.editor.chain().focus().setHeading({ level }).run();
    else props.editor.chain().focus().setParagraph().run();
}
function editLink(): void {
    const href: unknown = props.editor.getAttributes("link").href;
    link.value = typeof href === "string" ? href : "";
    linkOpen.value = true;
}
function applyLink(): void {
    const href = safeWordLink(link.value);
    if (href)
        props.editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href })
            .run();
    else if (!link.value.trim())
        props.editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else return;
    linkOpen.value = false;
}
</script>

<template>
    <fieldset
        class="flex flex-wrap items-center gap-1 border-b border-default pb-2"
        :aria-label="t('formatting.title')"
    >
        <select
            :value="current.heading"
            :disabled="disabled"
            :aria-label="t('formatting.heading')"
            data-testid="format-heading"
            class="bg-default border border-default rounded p-1 text-sm max-w-36"
            @change="changeHeading"
        >
            <option value="0">{{ t('formatting.paragraph') }}</option>
            <option v-for="level in [1, 2, 3]" :key="level" :value="level">
                {{ t('formatting.heading') }} {{ level }}
            </option>
        </select>
        <input
            :value="current.font"
            :disabled="disabled"
            :aria-label="t('wordExport.fontFamily')"
            :placeholder="t('formatting.defaultFont')"
            list="editor-fonts"
            data-testid="format-font"
            class="bg-default border border-default rounded p-1 text-sm w-32"
            maxlength="100"
            @change="changeFont"
        >
        <datalist id="editor-fonts">
            <option>Arial</option>
            <option>Aptos</option>
            <option>Calibri</option>
            <option>Times New Roman</option>
        </datalist>
        <input
            :value="current.size"
            :disabled="disabled"
            :aria-label="t('wordExport.fontSize')"
            placeholder="pt"
            type="number"
            min="6"
            max="72"
            step="0.5"
            data-testid="format-size"
            class="bg-default border border-default rounded p-1 text-sm w-16"
            @change="changeSize"
        >
        <UButton
            v-for="action in actions"
            :key="action"
            :icon="icons[action]"
            :aria-label="t(`formatting.${action}`)"
            :aria-pressed="active(action)"
            :variant="active(action) ? 'soft' : 'ghost'"
            color="neutral"
            :disabled="disabled"
            :data-testid="`format-${action}`"
            @mousedown.prevent
            @click="toggle(action)"
        />
        <UButton
            icon="i-lucide-link"
            :aria-label="t('formatting.link')"
            color="neutral"
            variant="ghost"
            :disabled="disabled"
            data-testid="format-link"
            @mousedown.prevent
            @click="editLink"
        />
        <UModal v-model:open="linkOpen" :title="t('formatting.link')">
            <template #body>
                <form class="grid gap-3" @submit.prevent="applyLink">
                    <label class="grid gap-1"
                        >{{ t('formatting.linkUrl') }}
                        <input
                            v-model="link"
                            type="text"
                            class="bg-default border border-default rounded p-2"
                            data-testid="format-link-url"
                        ></label
                    >
                    <p class="text-sm text-muted">
                        {{ t('formatting.linkHint') }}
                    </p>
                    <UButton
                        type="submit"
                        :disabled="disabled || (!!link.trim() && !safeWordLink(link))"
                        >{{ t('formatting.apply') }}</UButton
                    >
                </form>
            </template>
        </UModal>
    </fieldset>
</template>
