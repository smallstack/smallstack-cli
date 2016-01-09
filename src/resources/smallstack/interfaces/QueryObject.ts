/// <reference path="../typedefinitions/meteor/meteor.d.ts" />

interface QueryObject<T> {
    subscribe(): { then: ((subscriptionHandle: any) => void) };
    cursor: Mongo.Cursor<T>;
    expand(foreignKeys: string[]): void;
}

