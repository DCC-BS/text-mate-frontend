export class Queue<T> {
    constructor(private readonly items: T[] = []) {}

    enqueue(item: T): void {
        this.items.push(item);
    }

    dequeue(): T | undefined {
        return this.items.shift();
    }

    peek(): T | undefined {
        return this.items[0];
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
