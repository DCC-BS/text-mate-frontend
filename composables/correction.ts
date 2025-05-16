import type { ILogger } from "@dcc-bs/logger.bs.js";
import { match } from "ts-pattern";
import {
    Cmds,
    type CorrectionBlockChangedCommand,
} from "~/assets/models/commands";
import type {
    CorrectedSegments,
    TextCorrectionBlock,
} from "~/assets/models/text-correction";
import { createCorrectionFetcher } from "~/assets/services/CorrectionFetcher";
import { CorrectionService } from "~/assets/services/CorrectionService";

export type CorrectionHandler = (
    correctedSentence: TextCorrectionBlock,
) => void;

let correctionService: CorrectionService | undefined = undefined;

const onAddHandlers = new Set<CorrectionHandler>();
const onRemoveHandlers = new Set<CorrectionHandler>();
const onUpdateHandlers = new Set<CorrectionHandler>();

const correctedBlocks = ref<Record<string, TextCorrectionBlock>>({});
const blocks = computed(() => {
    return Object.values(correctedBlocks.value).sort((a, b) => {
        return a.offset - b.offset;
    });
});

export function useCorrectionService() {
    const logger = useLogger();
    const { executeCommand, registerHandler, unregisterHandler } =
        useCommandBus();

    const userDictStore = useUserDictionaryStore();
    const fetcher = createCorrectionFetcher(
        "auto",
        logger,
        userDictStore.exists.bind(userDictStore),
    );
    const { sendError } = useUseErrorDialog();

    correctionService = new CorrectionService(
        logger,
        executeCommand,
        fetcher,
        sendError,
    );

    const handleChanged = async (command: CorrectionBlockChangedCommand) =>
        handleCorrectedSentenceChangedCommand(command, logger);

    onMounted(() => {
        registerHandler(Cmds.CorrectionBlockChangedCommand, handleChanged);
    });

    onUnmounted(() => {
        unregisterHandler(Cmds.CorrectionBlockChangedCommand, handleChanged);
    });

    return correctionService;
}

async function handleCorrectedSentenceChangedCommand(
    command: CorrectionBlockChangedCommand,
    logger: ILogger,
) {
    try {
        match(command.change)
            .with("add", () => {
                handleAddCorrectedSentence(command.block, logger);
            })
            .with("remove", () => {
                handleRemoveCorrectedSentence(command.block, logger);
            })
            .with("update", () => {
                handleUpdateCorrectedSentence(command.block, logger);
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
 * @param block - The sentence to be added
 * @param logger - Logger instance to report warnings
 */
function handleAddCorrectedSentence(
    block: TextCorrectionBlock,
    logger: ILogger,
): void {
    // Check if sentence already exists
    if (block.id in correctedBlocks.value) {
        logBlockWarning(
            `Corrected sentence with id ${block.id} already exists`,
            logger,
        );
    }

    // Add to state and notify handlers
    correctedBlocks.value[block.id] = block;
    notifyHandlers(onAddHandlers, block, logger);
}

/**
 * Handles removing a corrected sentence
 * @param block - The block to be removed
 * @param logger - Logger instance to report warnings
 */
function handleRemoveCorrectedSentence(
    block: TextCorrectionBlock,
    logger: ILogger,
): void {
    // Check if block exists before removing
    if (!(block.id in correctedBlocks.value)) {
        logBlockWarning(
            `On Remove: Corrected block with id ${block.id} does not exist`,
            logger,
        );
        return;
    }

    // Remove from state and notify handlers
    delete correctedBlocks.value[block.id];
    notifyHandlers(onRemoveHandlers, block, logger);
}

/**
 * Handles updating an existing corrected sentence
 * @param block - The block with updated content
 * @param logger - Logger instance to report warnings
 */
function handleUpdateCorrectedSentence(
    block: TextCorrectionBlock,
    logger: ILogger,
): void {
    // Check if block exists before updating
    if (!(block.id in correctedBlocks.value)) {
        logBlockWarning(
            `On Update: Corrected block with id ${block.id} does not exist`,
            logger,
        );
    }

    // Update state and notify handlers
    correctedBlocks.value[block.id] = block;
    notifyHandlers(onUpdateHandlers, block, logger);
}

/**
 * Logs warning and debug info for block operations
 * @param message - Warning message to log
 * @param logger - Logger instance
 */
function logBlockWarning(message: string, logger: ILogger): void {
    logger.warn(message);
    logger.debug(
        `Corrected blocks: ${JSON.stringify(correctedBlocks.value, null, 2)}`,
    );
}

/**
 * Notifies all registered handlers for a block event
 * @param handlers - Set of handlers to notify
 * @param block - The blockß that triggered the event
 */
function notifyHandlers(
    handlers: Set<CorrectionHandler>,
    block: TextCorrectionBlock,
    logger: ILogger,
): void {
    for (const handler of handlers) {
        try {
            handler(block);
        } catch (e) {
            logger.error(`Error in handler ${e}`);
        }
    }
}

export function useCorrection() {
    const _onAddHandlers = [] as CorrectionHandler[];
    const _onRemoveHandlers = [] as CorrectionHandler[];
    const _onUpdateHandlers = [] as CorrectionHandler[];

    function onCorrectedBlockAdded(handler: CorrectionHandler) {
        if (onAddHandlers.has(handler)) {
            throw new Error("Handler already registered");
        }

        onAddHandlers.add(handler);
        _onAddHandlers.push(handler);
    }

    function onCorrectedBlockRemoved(handler: CorrectionHandler) {
        if (onRemoveHandlers.has(handler)) {
            throw new Error("Handler already registered");
        }
        onRemoveHandlers.add(handler);
        _onRemoveHandlers.push(handler);
    }

    function onCorrectedBlockUpdated(handler: CorrectionHandler) {
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
        onCorrectedBlockAdded,
        onCorrectedBlockRemoved,
        onCorrectedBlockUpdated,
        correctedSentence: correctedBlocks,
        blocks,
    };
}

function moveBlocks(offset: number, blocks: TextCorrectionBlock[]) {
    return blocks.map((block) => ({
        ...block,
        offset: block.offset + offset,
    }));
}

export function makeCorrectedSentenceAbsolute(sentence: CorrectedSegments) {
    return {
        ...sentence,
        blocks: moveBlocks(sentence.from, sentence.blocks),
    };
}
