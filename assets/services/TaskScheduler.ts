/**
 * Represents a task to be executed.
 */
type Task = {
    action: (signal: AbortSignal) => Promise<void>;
    hasStarted: boolean;
    promise?: Promise<void>;
    queuedAt: Date;
    abortController: AbortController;
    canBeAborted: boolean;
};

/**
 * Represents a task action that takes an AbortSignal and returns a Promise.
 */
type TaskAction = (signal: AbortSignal) => Promise<void>;

/**
 * TaskScheduler is responsible for scheduling and running tasks.
 * It ensures that only the last enqueued task is executed after a delay,
 * and cancels any previously scheduled tasks.
 */
export class TaskScheduler {
    private startedTask: Task | undefined;
    private lastAction: TaskAction | undefined;
    private lateStartTimeout: NodeJS.Timeout | undefined;

    /**
     * Stores a new task action to be executed after a delay.
     * Cancels any previously scheduled tasks.
     *
     * @param action - The task action to be executed.
     */
    public schedule(action: (signal: AbortSignal) => Promise<void>): void {
        this.lastAction = action;
        if (this.lateStartTimeout) {
            clearTimeout(this.lateStartTimeout);
        }

        this.lateStartTimeout = setTimeout(() => {
            this.executeImmediately();
        }, 1000);
    }

    /**
     * Runs the task action immediately.
     * Cancels any previously scheduled tasks.
     */
    public executeImmediately(canBeAborted = true): void {
        if (!this.lastAction) {
            return;
        }

        if (this.lateStartTimeout) {
            clearTimeout(this.lateStartTimeout);
        }

        if (this.startedTask?.canBeAborted) {
            this.startedTask.abortController.abort("aborted");
        }

        const abortController = new AbortController();

        this.startedTask = {
            action: this.lastAction,
            hasStarted: false,
            queuedAt: new Date(),
            promise: this.lastAction(abortController.signal),
            abortController: abortController,
            canBeAborted: canBeAborted,
        };
    }
}
