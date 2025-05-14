export class Queue<T> {
    private readonly items: T[];

    constructor(items: T[] = [], copy = true) {
        if (copy) {
            this.items = [...items];
        } else {
            this.items = items;
        }
    }

    enqueue(item: T): void {
        this.items.push(item);
    }

    dequeue(): T | undefined {
        return this.items.shift();
    }

    safeDequeue(): T {
        if (this.isEmpty()) {
            throw new Error("Queue is empty");
        }
        return this.dequeue() as T;
    }

    peek(): T | undefined {
        return this.items[0];
    }

    safePeek(): T {
        if (this.isEmpty()) {
            throw new Error("Queue is empty");
        }
        return this.peek() as T;
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }

    size(): number {
        return this.items.length;
    }

    clear(): void {
        this.items.length = 0;
    }

    toArray(): T[] {
        return [...this.items];
    }

    forEach(callback: (item: T) => void): void {
        this.items.forEach(callback);
    }

    map<U>(callback: (item: T) => U): U[] {
        return this.items.map(callback);
    }

    filter(callback: (item: T) => boolean): T[] {
        return this.items.filter(callback);
    }
}
