import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type { RibbonTransformProps } from "~/types/ribbon";
import { TextActionGetOutputSchema } from "~~/shared/text-actions";

/** A single sub-option of a multi-option transform action (e.g. Summarize). */
export type MobileActionOption = {
    label: string;
    icon?: string;
    config: string;
};

/** One transform action, modelled for the mobile ribbon. */
export type MobileAction =
    | {
          kind: "simple";
          id: string;
          label: string;
          icon: string;
          action: string;
          config?: string;
      }
    | {
          kind: "options";
          id: string;
          label: string;
          icon: string;
          options: MobileActionOption[];
      }
    | {
          kind: "custom";
          id: string;
          label: string;
          icon: string;
      };

/** A labelled group of actions, mirroring the desktop ribbon sections. */
export type MobileActionGroup = {
    id: string;
    label: string;
    icon?: string;
    actions: MobileAction[];
};

/**
 * Builds the transform-tab action tree (the same actions as the desktop ribbon,
 * flattened into a mobile-friendly model) and owns the shared apply guard/logic.
 */
export function useMobileActions(props: RibbonTransformProps) {
    const { t } = useI18n();
    const { runQuickAction } = useQuickAction();
    const toast = useToast();
    const { showError } = useUserFeedback();
    const logger = useLogger();

    const actionsAreAvailable = computed(
        () => props.editable && !props.busy && props.text.trim().length > 0,
    );

    /** Runs a transform action, toasting when no text is available. */
    async function apply(action: string, config?: string): Promise<void> {
        if (!actionsAreAvailable.value) {
            toast.add({
                title: t("errors.title"),
                description: t("errors.no_text_to_process"),
                color: "error",
                icon: "i-lucide-circle-alert",
            });
            return;
        }
        await runQuickAction({
            action,
            text: props.text,
            options: config ?? "",
        });
    }

    // Dynamic user-defined actions, folded into the "Custom" group.
    const userActions = ref<{ id: string; name: string }[]>([]);

    onMounted(async () => {
        const response = await apiFetch("/api/user-actions", {
            method: "get",
            schema: TextActionGetOutputSchema,
        });
        if (isApiError(response)) {
            logger.error(response, "Failed to load user actions");
            showError(response);
        } else {
            userActions.value = response.actions.map((a) => ({
                id: a.id,
                name: a.name,
            }));
        }
    });

    const groups = computed<MobileActionGroup[]>(() => [
        {
            id: "restructure",
            label: t("ribbon.restructure"),
            icon: "i-lucide-list-tree",
            actions: [
                {
                    kind: "options",
                    id: "summarize",
                    label: t("editor.summarize"),
                    icon: "i-lucide-summary",
                    options: [
                        {
                            label: t("quick-actions.summarize.sentence"),
                            icon: "i-lucide-tally-1",
                            config: "sentence",
                        },
                        {
                            label: t("quick-actions.summarize.three_sentence"),
                            icon: "i-lucide-tally-3",
                            config: "three_sentence",
                        },
                        {
                            label: t("quick-actions.summarize.paragraph"),
                            icon: "i-lucide-text-wrap",
                            config: "paragraph",
                        },
                        {
                            label: t("quick-actions.summarize.page"),
                            icon: "i-lucide-file-text",
                            config: "page",
                        },
                        {
                            label: t(
                                "quick-actions.summarize.management_summary",
                            ),
                            icon: "i-lucide-file-user",
                            config: "management_summary",
                        },
                    ],
                },
                {
                    kind: "simple",
                    id: "bullet_points",
                    label: t("editor.bullet_points"),
                    icon: "i-lucide-list",
                    action: "bullet_points",
                },
            ],
        },
        {
            id: "rewriteFor",
            label: t("ribbon.rewriteFor"),
            icon: "i-lucide-pen-line",
            actions: [
                {
                    kind: "options",
                    id: "social_mediafy",
                    label: t("editor.social_mediafy"),
                    icon: "i-lucide-messages-square",
                    options: [
                        {
                            label: t("quick-actions.social-mediafy.bluesky"),
                            icon: "i-simple-icons-bluesky",
                            config: "bluesky",
                        },
                        {
                            label: t("quick-actions.social-mediafy.instagram"),
                            icon: "i-simple-icons-instagram",
                            config: "instagram",
                        },
                        {
                            label: t("quick-actions.social-mediafy.linkedin"),
                            icon: "i-simple-icons-linkedin",
                            config: "linkedin",
                        },
                    ],
                },
                {
                    kind: "options",
                    id: "medium",
                    label: t("editor.medium"),
                    icon: "i-lucide-tv-minimal-play",
                    options: [
                        {
                            label: t("quick-actions.medium.email"),
                            icon: "i-lucide-mail",
                            config: "email",
                        },
                        {
                            label: t("quick-actions.medium.official_letter"),
                            icon: "i-lucide-mailbox",
                            config: "official_letter",
                        },
                        {
                            label: t("quick-actions.medium.presentation"),
                            icon: "i-lucide-presentation",
                            config: "presentation",
                        },
                        {
                            label: t("quick-actions.medium.report"),
                            icon: "i-lucide-file-chart-column",
                            config: "report",
                        },
                    ],
                },
                {
                    kind: "options",
                    id: "character_speech",
                    label: t("editor.character_speech"),
                    icon: "i-lucide-speech",
                    options: [
                        {
                            label: t("quick-actions.character_speech.direct"),
                            icon: "i-lucide-message-square-more",
                            config: "direct_speech",
                        },
                        {
                            label: t("quick-actions.character_speech.indirect"),
                            icon: "i-lucide-message-square-quote",
                            config: "indirect_speech",
                        },
                    ],
                },
                {
                    kind: "options",
                    id: "formality",
                    label: t("editor.formality"),
                    icon: "i-lucide-shirt",
                    options: [
                        {
                            label: t("quick-actions.formality.formal"),
                            icon: "i-lucide-briefcase-business",
                            config: "formal",
                        },
                        {
                            label: t("quick-actions.formality.informal"),
                            icon: "i-lucide-tree-palm",
                            config: "informal",
                        },
                    ],
                },
            ],
        },
        {
            id: "polish",
            label: t("ribbon.polish"),
            icon: "i-lucide-sparkles",
            actions: [
                {
                    kind: "simple",
                    id: "plain_language",
                    label: t("editor.plain_language"),
                    icon: "i-lucide-book-open",
                    action: "plain_language",
                },
                {
                    kind: "simple",
                    id: "proofread",
                    label: t("editor.proofread"),
                    icon: "i-lucide-check",
                    action: "proofread",
                },
            ],
        },
        {
            id: "custom",
            label: t("actions.custom"),
            icon: "i-lucide-wand-2",
            actions: [
                {
                    kind: "custom",
                    id: "custom",
                    label: t("actions.custom"),
                    icon: "i-lucide-circle-ellipsis",
                },
                ...userActions.value.map((u) => ({
                    kind: "simple" as const,
                    id: u.id,
                    label: u.name,
                    icon: "i-lucide-user-cog",
                    action: u.id,
                })),
            ],
        },
    ]);

    return { actionsAreAvailable, apply, groups };
}
