type CommandHandler = (command: unknown) => Promise<void>;

export function useCommandEvent() {
    const { registerHandler, unregisterHandler } = useCommandBus();
    const registredHandlers = [] as { key: string; handler: CommandHandler }[];

    function onCommand<TCommand>(
        commandKey: string,
        callback: (command: TCommand) => Promise<void>,
    ) {
        const castedCallback = callback as CommandHandler;
        registredHandlers.push({ key: commandKey, handler: castedCallback });
        registerHandler(commandKey, castedCallback);
    }

    onUnmounted(() => {
        for (const { key, handler } of registredHandlers) {
            unregisterHandler(key, handler);
        }
    });

    return { onCommand };
}
