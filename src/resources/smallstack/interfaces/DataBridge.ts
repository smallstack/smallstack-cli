
interface DataBridge {
    // collections
    subscribe(name: string, parameters: any, options: any): { then: ((subscriptionHandle: any) => void) };
    getCountForQuery(queryName: string, parameters: any, callback: (error: Error, count: number) => void): void;
    getCollectionByName(name: string): any;
    
    // methods
    call(methodName: string, parameters: string[], callback: (error: Error, success: any) => void): void;

    getCurrentUserId(): string;
}