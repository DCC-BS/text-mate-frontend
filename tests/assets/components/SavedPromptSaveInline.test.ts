import { mount } from "@vue/test-utils";
import { computed, defineComponent, h, ref } from "vue";
import SavedPromptSaveInline from "~/components/saved-prompt/SavedPromptSaveInline.vue";

// Stub auto-imported Nuxt helpers in Vitest
vi.stubGlobal("computed", computed);
vi.stubGlobal("ref", ref);
vi.stubGlobal("useI18n", () => ({ t: (key: string) => key }));

// `save` stays pending until the test resolves it, like a slow IndexedDB write.
let resolveSave: (ok: boolean) => void = () => undefined;
const save = vi.fn(
    () =>
        new Promise<boolean>((resolve) => {
            resolveSave = resolve;
        }),
);
vi.stubGlobal("useSavedPrompts", () => ({ save }));

/** Minimal UButton: a native button that keeps the disabled state and slot. */
const UButton = defineComponent({
    props: { disabled: Boolean },
    emits: ["click"],
    setup(props, { emit, slots, attrs }) {
        return () =>
            h(
                "button",
                {
                    ...attrs,
                    disabled: props.disabled,
                    onClick: () => emit("click"),
                },
                slots.default?.(),
            );
    },
});

/** Minimal UInput: a native input wired to v-model. */
const UInput = defineComponent({
    props: { modelValue: { type: String, default: "" } },
    emits: ["update:modelValue"],
    setup(props, { emit, attrs }) {
        return () =>
            h("input", {
                ...attrs,
                value: props.modelValue,
                onInput: (event: Event) =>
                    emit(
                        "update:modelValue",
                        (event.target as HTMLInputElement).value,
                    ),
            });
    },
});

describe("SavedPromptSaveInline", () => {
    beforeEach(() => {
        save.mockClear();
    });

    it("saves only once when Speichern is clicked twice during a save", async () => {
        const wrapper = mount(SavedPromptSaveInline, {
            props: { prompt: "Kurz und klar" },
            global: { stubs: { UButton, UInput } },
        });
        await wrapper.get('[data-testid="savePromptToggle"]').trigger("click");
        await wrapper.get('[data-testid="savePromptName"]').setValue("Medien");

        const submit = wrapper.get('[data-testid="savePromptSubmit"]');
        await submit.trigger("click");
        await submit.trigger("click");
        resolveSave(true);
        await Promise.resolve();

        expect(save).toHaveBeenCalledOnce();
    });
});
