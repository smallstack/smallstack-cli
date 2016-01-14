/// <reference path="QueryObject.ts" />

interface DataBridge<T> {
    subscribe(name: string, parameters: any, options: any): { then: ((subscriptionHandle: any) => void) };
    getCountForQuery(queryName: string, parameters: any);
    newQueryObject(): QueryObject<T>;
}