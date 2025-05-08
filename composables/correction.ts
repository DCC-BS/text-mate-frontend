import { match } from "ts-pattern";
import {
    Cmds,
    type CorrectedSentenceChangedCommand,
} from "~/assets/models/commands";
import type {
    CorrectedSentence,
    TextCorrectionBlock,
} from "~/assets/models/text-correction";
import { CorrectionService } from "~/assets/services/CorrectionService";

export type CorrectionHandler = (correctedSentence: CorrectedSentence) => void;

let correctionService: CorrectionService | undefined = undefined;

const onAddHandlers = new Set<CorrectionHandler>();
const onRemoveHandlers = new Set<CorrectionHandler>();
const onUpdateHandlers = new Set<CorrectionHandler>();

const correctedSentence = ref<Record<string, CorrectedSentence>>({});
const blocks = computed(() => {
    return Object.values(correctedSentence.value)
        .flatMap((sentence) => makeCorrectedSentenceAbsolute(sentence).blocks)
        .sort((a, b) => {
            return a.offset - b.offset;
        });
});

export function useCorrectionService() {
    const logger = useLogger();
    const { executeCommand, registerHandler, unregisterHandler } =
        useCommandBus();
    const userDictStore = useUserDictionaryStore();
    const { sendError } = useUseErrorDialog();

    async function handleCorrectedSentenceChangedCommand(
        command: CorrectedSentenceChangedCommand,
    ) {
        match(command.change)
            .with("add", () => {
                if (command.correctedSentence.id in correctedSentence.value) {
                    logger.warn(
                        `Corrected sentence with id ${command.correctedSentence.id} already exists`,
                    );
                }

                correctedSentence.value[command.correctedSentence.id] =
                    command.correctedSentence;

                for (const handler of onAddHandlers) {
                    handler(command.correctedSentence);
                }
            })
            .with("remove", () => {
                if (
                    !(command.correctedSentence.id in correctedSentence.value)
                ) {
                    logger.warn(
                        `Corrected sentence with id ${command.correctedSentence.id} does not exist`,
                    );
                }

                delete correctedSentence.value[command.correctedSentence.id];

                for (const handler of onRemoveHandlers) {
                    handler(command.correctedSentence);
                }
            })
            .with("update", () => {
                if (
                    !(command.correctedSentence.id in correctedSentence.value)
                ) {
                    logger.warn(
                        `Corrected sentence with id ${command.correctedSentence.id} does not exist`,
                    );
                }

                correctedSentence.value[command.correctedSentence.id] =
                    command.correctedSentence;

                for (const handler of onUpdateHandlers) {
                    handler(command.correctedSentence);
                }
            })
            .exhaustive();
    }

    correctionService = new CorrectionService(
        logger,
        executeCommand,
        userDictStore.exists,
        sendError,
    );

    onMounted(() => {
        registerHandler(
            Cmds.CorrectedSentenceChangedCommand,
            handleCorrectedSentenceChangedCommand,
        );
    });

    onUnmounted(() => {
        unregisterHandler(
            Cmds.CorrectedSentenceChangedCommand,
            handleCorrectedSentenceChangedCommand,
        );
    });

    return correctionService;
}

export function useCorrection() {
    const _onAddHandlers = [] as CorrectionHandler[];
    const _onRemoveHandlers = [] as CorrectionHandler[];
    const _onUpdateHandlers = [] as CorrectionHandler[];

    function onCorrectedSenteceAdded(handler: CorrectionHandler) {
        if (onAddHandlers.has(handler)) {
            throw new Error("Handler already registered");
        }

        onAddHandlers.add(handler);
        _onAddHandlers.push(handler);
    }

    function onCorrectedSentenceRemoved(handler: CorrectionHandler) {
        if (onRemoveHandlers.has(handler)) {
            throw new Error("Handler already registered");
        }
        onRemoveHandlers.add(handler);
        _onRemoveHandlers.push(handler);
    }

    function onCorrectedSentenceUpdated(handler: CorrectionHandler) {
        if (onUpdateHandlers.has(handler)) {
            throw new Error("Handler already registered");
        }
        onUpdateHandlers.add(handler);
        _onUpdateHandlers.push(handler);
    }

    onUnmounted(() => {
        for (const handler of _onAddHandlers) {
            onAddHandlers.delete(handler);
        }

        for (const handler of _onRemoveHandlers) {
            onRemoveHandlers.delete(handler);
        }

        for (const handler of _onUpdateHandlers) {
            onUpdateHandlers.delete(handler);
        }
    });

    return {
        onCorrectedSenteceAdded,
        onCorrectedSentenceRemoved,
        onCorrectedSentenceUpdated,
        correctedSentence,
        blocks,
    };
}

function moveBlocks(offset: number, blocks: TextCorrectionBlock[]) {
    return blocks.map((block) => ({
        ...block,
        offset: block.offset + offset,
    }));
}

export function makeCorrectedSentenceAbsolute(sentence: CorrectedSentence) {
    return {
        ...sentence,
        blocks: moveBlocks(sentence.from, sentence.blocks),
    };
}
