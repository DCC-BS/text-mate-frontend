import { LazyUForm } from "#components";
import type { ILogger } from "@dcc-bs/logger.bs.js";
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

    correctionService = new CorrectionService(
        logger,
        executeCommand,
        userDictStore.exists,
        sendError,
    );

    const handleChanged = async (command: CorrectedSentenceChangedCommand) =>
        handleCorrectedSentenceChangedCommand(command, logger);

    onMounted(() => {
        registerHandler(Cmds.CorrectedSentenceChangedCommand, handleChanged);
    });

    onUnmounted(() => {
        unregisterHandler(Cmds.CorrectedSentenceChangedCommand, handleChanged);
    });

    return correctionService;
}

async function handleCorrectedSentenceChangedCommand(
    command: CorrectedSentenceChangedCommand,
    logger: ILogger,
) {
    try {
        match(command.change)
            .with("add", () => {
                handleAddCorrectedSentence(command.correctedSentence, logger);
            })
            .with("remove", () => {
                handleRemoveCorrectedSentence(
                    command.correctedSentence,
                    logger,
                );
            })
            .with("update", () => {
                handleUpdateCorrectedSentence(
                    command.correctedSentence,
                    logger,
                );
            })
            .exhaustive();
    } catch (e) {
        logger.error("Error handling corrected sentence change", e);

        if (e instanceof Error) {
            logger.debug(e.message);
            if (e.stack) {
                logger.debug(e.stack);
            }
        }
    }
}

/**
 * Handles adding a new corrected sentence
 * @param sentence - The sentence to be added
 * @param logger - Logger instance to report warnings
 */
function handleAddCorrectedSentence(
    sentence: CorrectedSentence,
    logger: ILogger,
): void {
    // Check if sentence already exists
    if (sentence.id in correctedSentence.value) {
        logSentenceWarning(
            `Corrected sentence with id ${sentence.id} already exists`,
            logger,
        );
    }

    // Add to state and notify handlers
    correctedSentence.value[sentence.id] = sentence;
    notifyHandlers(onAddHandlers, sentence, logger);
}

/**
 * Handles removing a corrected sentence
 * @param sentence - The sentence to be removed
 * @param logger - Logger instance to report warnings
 */
function handleRemoveCorrectedSentence(
    sentence: CorrectedSentence,
    logger: ILogger,
): void {
    // Check if sentence exists before removing
    if (!(sentence.id in correctedSentence.value)) {
        logSentenceWarning(
            `On Remove: Corrected sentence with id ${sentence.id} does not exist`,
            logger,
        );
        return;
    }

    // Remove from state and notify handlers
    delete correctedSentence.value[sentence.id];
    notifyHandlers(onRemoveHandlers, sentence, logger);
}

/**
 * Handles updating an existing corrected sentence
 * @param sentence - The sentence with updated content
 * @param logger - Logger instance to report warnings
 */
function handleUpdateCorrectedSentence(
    sentence: CorrectedSentence,
    logger: ILogger,
): void {
    // Check if sentence exists before updating
    if (!(sentence.id in correctedSentence.value)) {
        logSentenceWarning(
            `On Update: Corrected sentence with id ${sentence.id} does not exist`,
            logger,
        );
    }

    // Update state and notify handlers
    correctedSentence.value[sentence.id] = sentence;
    notifyHandlers(onUpdateHandlers, sentence, logger);
}

/**
 * Logs warning and debug info for sentence operations
 * @param message - Warning message to log
 * @param logger - Logger instance
 */
function logSentenceWarning(message: string, logger: ILogger): void {
    logger.warn(message);
    logger.debug(
        `Corrected sentences: ${JSON.stringify(
            correctedSentence.value,
            null,
            2,
        )}`,
    );
}

/**
 * Notifies all registered handlers for a sentence event
 * @param handlers - Set of handlers to notify
 * @param sentence - The sentence that triggered the event
 */
function notifyHandlers(
    handlers: Set<CorrectionHandler>,
    sentence: CorrectedSentence,
    logger: ILogger,
): void {
    for (const handler of handlers) {
        try {
            handler(sentence);
        } catch (e) {
            logger.error(`Error in handler ${e}`);
        }
    }
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
