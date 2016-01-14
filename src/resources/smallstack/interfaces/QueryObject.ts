/// <reference path="../typedefinitions/meteor/meteor.d.ts" />

interface QueryObject<T> {
    subscribe(): { then: ((subscriptionHandle: any) => void) };
    getSelector(): any;
    setSelector(selector: any): void;
    getOptions(): any;
    setOptions(options: any): void;
    expand(foreignKeys: string[]): void;
}

