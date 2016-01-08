
interface QueryObject<T> {
    subscribe(): { then: ((subscriptionHandle: any) => void) };
    fetch(): T[];
    cursor(): any;
    expand(foreignKeys: string[]): void;
}

